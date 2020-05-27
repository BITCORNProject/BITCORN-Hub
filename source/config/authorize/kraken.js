/*

*/

"use strict";

const Authenticated = require("./shared/authenticated");
const AppOptions = require("./shared/app-options");

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const auth = require('../../../settings/auth');

const authenticated = new Authenticated();

const channel = {
	_id: 0,
	status: ''
};

const appOptions = new AppOptions({
	authorize_path: 'https://api.twitch.tv/kraken/oauth2/authorize',
	client_id: auth.data.KRAKEN_CLIENT_ID,
	client_secret: auth.data.KRAKEN_SECRET,
	redirect_uri: auth.data.KRAKEN_CALLBACK_URL,
	scope: [
		'openid',
		'viewing_activity_read',
		'user_subscriptions',
		'channel_editor',
		'channel_read',
		'channel_subscriptions',
		'channel_check_subscription'
	]
});

async function authenticateCode({ code, state }) {

	const json = await appOptions.authenticateCode({
		token_url: 'https://api.twitch.tv/kraken/oauth2/token',
		code,
		state
	});

	authenticated.updateValues(json);

	const { result } = await getChannel();
	channel._id = result ? result._id : '';
	
	return keepAlive();
};

async function keepAlive() {

	const url = 'https://api.twitch.tv/kraken/oauth2/token';

	const form = {
		grant_type: 'refresh_token',
		refresh_token: authenticated.refresh_token,
		client_id: appOptions.client_id,
		client_secret: appOptions.client_secret,
	};

	const options = { method: 'POST', body: new URLSearchParams(form) };

	const json = await fetch(url, options)
		.then(res => res.json())
		.catch(error => { error });

	if (json.error) {
		return { error: error };
	}

	authenticated.updateValues(json);

	setTimeout(keepAlive, (authenticated.expires_in - 1000) * 1000);

	return { error: null };
}

function getAuthorizedOptions(access_token) {
	return {
		headers: {
			'Accept': 'application/vnd.twitchtv.v5+json',
			'Client-ID': appOptions.client_id,
			'Authorization': 'OAuth ' + access_token,
			'Content-Type': 'application/json'
		}
	};
}

async function getEndpoint(url) {

	const result = await fetch(url, getAuthorizedOptions(authenticated.access_token))
		.then(res => res.json())
		.catch(error => { error });

	if (!result) {
		return { success: false, message: `Kraken endpoint failed: ${url}`, error: new Error(`Kraken endpoint failed: ${url}`) };
	}
	if (result.error) {
		return { success: false, message: result.error.message, error: result.error };
	}

	return { success: true, result };
}

async function getChannel() {
	return getEndpoint(`https://api.twitch.tv/kraken/channel`);
}

async function getUserLogins(usernames) {
	return getEndpoint(`https://api.twitch.tv/kraken/users?login=${usernames}`);
}

async function getSubscribersById(channel_id) {
	return getLimitedSubscribersById(channel_id, 100, 0, 'asc');
}

// direction = asc || desc
async function getLimitedSubscribersById(channel_id, limit, offset, direction = 'asc') {
	return getEndpoint(`https://api.twitch.tv/kraken/channels/${channel_id}/subscriptions?limit=${limit}&offset=${offset}&direction=${direction}`);
}

async function getLimitedSubscribers(limit, offset, direction = 'asc') {
	return getLimitedSubscribersById(getChannelId(), limit, offset, direction);
}

async function getChannelSubscribers() {
	return getSubscribersById(getChannelId());
}
async function getUserSubscribes(user_id) {
	return getEndpoint(`https://api.twitch.tv/kraken/channels/${getChannelId()}/subscriptions/${user_id}`);
}

function getChannelId() {
	return channel._id;
}

async function init(app) {
	app.on('connection', (socket) => {
		const lastIndex = socket.handshake.headers.referer.lastIndexOf('/');
		const clientName = socket.handshake.headers.referer.substring(lastIndex + 1, socket.handshake.headers.referer.length);

		if (clientName === 'control-panel') {
			//console.log('KRAKEN', clientName);
			socket.emit('login-kraken', { name: 'kraken', authenticated: channel._id });
		}
	});

	return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;
exports.authUrl = () => appOptions.authUrl;
exports.authenticateCode = authenticateCode;
exports.getChannel = getChannel;
exports.getUserLogins = getUserLogins;
exports.getUserSubscribes = getUserSubscribes;
exports.getChannelSubscribers = getChannelSubscribers;
exports.getLimitedSubscribers = getLimitedSubscribers;
exports.getLimitedSubscribersById = getLimitedSubscribersById;
