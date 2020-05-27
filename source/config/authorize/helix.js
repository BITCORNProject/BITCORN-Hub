/*

*/

"use strict";

const Authenticated = require("./shared/authenticated");
const AppOptions = require("./shared/app-options");

const fetch = require('node-fetch');
const auth = require('../../../settings/auth');

const authenticated = new Authenticated();

const channel = {
	user_id: 0,
	status: ''
};

const appOptions = new AppOptions({
	authorize_path: 'https://id.twitch.tv/oauth2/authorize',
	client_id: auth.data.HELIX_CLIENT_ID,
	client_secret: auth.data.HELIX_SECRET,
	redirect_uri: auth.data.HELIX_CALLBACK_URL,
	scope: [
		'user:edit:broadcast',
		'user:edit',
		'user:read:email',
		'analytics:read:games',
		'bits:read'
	]
});

async function authenticateCode({ code, state }) {

	if (appOptions.state !== state) {
		return { error: new Error(`state '${state}' does not match initial value '${appOptions.state}'`) };
	}

	const json = await appOptions.postForm({
		token_url: 'https://id.twitch.tv/oauth2/token', 
		form: appOptions.formAuthorizationCode(code),
		headers: {
			'Authorization': 'Basic ' + (Buffer.from(appOptions.client_id + ':' + appOptions.client_secret).toString('base64'))
		}
	});

	authenticated.updateValues(json);

	const result = await getUser();
	channel.user_id = result.id;

	return keepAlive();
};

async function keepAlive() {

	const json = await appOptions.postForm({
		token_url: 'https://id.twitch.tv/oauth2/token',
		form: appOptions.formRefreshToken(authenticated.refresh_token),
		headers: {
			'Authorization': 'Basic ' + (Buffer.from(appOptions.client_id + ':' + appOptions.client_secret).toString('base64'))
		}
	});

	authenticated.updateValues(json);

	setTimeout(keepAlive, (authenticated.expires_in - 1000) * 1000);

	return { error: null };
}

async function getEndpoint(url) {

	const result = await fetch(url, appOptions.getBearerOptions(authenticated.access_token))
		.then(res => res.json())
		.catch(error => { error });

	if (result.error) {
		return { success: false, message: result.error.message, error: result.error };
	}

	if (result.data) {
		if (result.data.length > 0) {
			result.data[0].success = true;
			return result.data[0];
		} else {
			return { success: false, message: `The stream seems to be offline.` };
		}
	}

	return { success: false, message: `Fetch endpoint ${url} failed.` };
}

async function getUserLogin(user_name) {
	return getEndpoint(`https://api.twitch.tv/helix/users?login=${user_name}`);
}

async function getUser() {
	return getEndpoint(`https://api.twitch.tv/helix/users`);
}

async function getStream() {
	return getStreamById(channel.user_id);
}

async function getStreamById(user_id) {
	return getEndpoint(`https://api.twitch.tv/helix/streams?user_id=${user_id}`);
}

async function getUserFollows(to_user_id, from_user_id) {
	return getEndpoint(`https://api.twitch.tv/helix/users/follows?to_id=${to_user_id}&from_id=${from_user_id}`);
}

async function getGame(game_id) {
	return getEndpoint(`https://api.twitch.tv/helix/games?id=${game_id}`);
}

async function init(app) {
	app.on('connection', (socket) => {
		const lastIndex = socket.handshake.headers.referer.lastIndexOf('/');
		const clientName = socket.handshake.headers.referer.substring(lastIndex + 1, socket.handshake.headers.referer.length);

		if (clientName === 'control-panel') {
			socket.emit('login-helix', { name: 'helix', authenticated: channel.user_id });
		}
	});

	return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;
exports.authUrl = () => appOptions.authUrl;
exports.authenticateCode = authenticateCode;
exports.getUser = getUser;
exports.getUserLogin = getUserLogin;
exports.getStream = getStream;
exports.getStreamById = getStreamById;
exports.getUserFollows = getUserFollows;
exports.getGame = getGame;