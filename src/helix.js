/*

*/

"use strict";

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

function Authenticated() {
	this.access_token = '';
	this.token_type = '';
	this.scope = '';
	this.expires_in = 0;
	this.refresh_token = '';
	this.id_token = '';
}

const authenticated = new Authenticated();

const channel = {
	user_id: 0,
	status: ''
};
const appOptions = {
	client_id: process.env.HELIX_CLIENT_ID,
	client_secret: process.env.HELIX_SECRET,
	redirect_uri: process.env.HELIX_CALLBACK_URL,
	scope: [
		'user:edit:broadcast',
		'user:edit',
		'user:read:email',
		'analytics:read:games',
		'bits:read',
		'channel:read:redemptions',
		'channel:manage:redemptions'
	].join(' ')
};

const tokenStore = {};

function authUrl() {

	const searchParamsEntries = [
		['client_id', appOptions.client_id],
		['redirect_uri', appOptions.redirect_uri],
		['response_type', 'code'],
		['scope', appOptions.scope],
		['state', 'bot-twitch-api-app'],
	];
	const searchParams = new URLSearchParams(searchParamsEntries);
	const urlQuery = searchParams.toString();

	return `https://id.twitch.tv/oauth2/authorize?${urlQuery}`;
}

async function authenticateCode(code) {

	const url = `https://id.twitch.tv/oauth2/token`;

	const form = {
		client_id: appOptions.client_id,
		client_secret: appOptions.client_secret,
		code: code,
		grant_type: 'authorization_code',
		redirect_uri: appOptions.redirect_uri
	};

	const headers = {
		'Authorization': 'Basic ' + (Buffer.from(appOptions.client_id + ':' + appOptions.client_secret).toString('base64'))
	};

	const options = { headers: headers, method: 'POST', body: new URLSearchParams(form) };

	const json = await fetch(url, options)
		.then(res => res.json())
		.catch(error => { error });

	if (json.error) {
		return { success: false, error: json.error };
	}

	authenticated.access_token = json.access_token;
	authenticated.refresh_token = json.refresh_token;
	authenticated.scope = json.scope;
	authenticated.expires_in = json.expires_in;

	await keepAlive();
};

async function keepAlive() {

	const json = await refreshAccessToken({
		refresh_token: authenticated.refresh_token,
		client_id: appOptions.client_id,
		client_secret: appOptions.client_secret
	});

	if (json.error) {
		return { success: false, error: json.error };
	}

	authenticated.access_token = json.access_token;
	authenticated.token_type = json.token_type;
	authenticated.expires_in = json.expires_in;

	setTimeout(keepAlive, (authenticated.expires_in - 1000) * 1000);

	const result = await getUser();
	channel.user_id = result.id;
}

async function refreshAccessToken({ refresh_token, client_id, client_secret }) {
	const url = 'https://id.twitch.tv/oauth2/token';

	const form = {
		grant_type: 'refresh_token',
		refresh_token: refresh_token,
		client_id: client_id,
		client_secret: client_secret,
	};

	const headers = {
		'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
	};

	const options = {
		headers: headers,
		method: 'POST',
		body: new URLSearchParams(form)
	};

	return fetch(url, options)
		.then(res => res.json())
		.catch(error => { error; });
}

function getAuthorizedOptions(client_id, access_token) {
	return {
		headers: {
			'Authorization': 'Bearer ' + access_token,
			'Client-ID': client_id,
			'Content-Type': 'application/json'
		}
	};
}

async function getEndpoint(url) {
	const result = await fetch(url, getAuthorizedOptions(appOptions.client_id, authenticated.access_token))
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

async function getRawEndpoint(url) {
	return fetch(url, getAuthorizedOptions(appOptions.client_id, authenticated.access_token))
		.then(res => res.json())
		.catch(error => { error });
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

async function getUsersByName(usernames) {
	const params = usernames.map(x => `login=${x}`).join('&');
	return getRawEndpoint(`https://api.twitch.tv/helix/users?${params}`);
}

async function getUsersByIds(ids) {
	const params = ids.map(x => `id=${x}`).join('&');
	return getRawEndpoint(`https://api.twitch.tv/helix/users?${params}`);
}


/* User token require BELOW*/

async function getUserAccessEndpoint(access_token, url) {
	const options = getAuthorizedOptions(process.env.API_CLIENT_ID, access_token);
	return fetch(url, options)
		.then(res => res.json())
		.catch(error => { error });
}

async function postUserAccessEndpoint(access_token, url, data) {
	const options = getAuthorizedOptions(process.env.API_CLIENT_ID, access_token);
	options.method = 'POST';
	if (data) {
		options.body = JSON.stringify(data);
	}
	return fetch(url, options)
		.then(res => res.json())
		.catch(error => { error });
}

async function deleteUserAccessEndpoint(access_token, url) {
	const options = getAuthorizedOptions(process.env.API_CLIENT_ID, access_token);
	options.method = 'DELETE';
	return fetch(url, options)
		.then(res => res.json())
		.catch(error => { error });
}

/**
 * throws if the broadcaster_id does not have an access token
 */
async function createCustomReward(broadcaster_id, data) {

	const { access_token } = tokenStore[broadcaster_id];
	if (!access_token) throw new Error(`No access token for ${broadcaster_id} create custom rewards`);

	return postUserAccessEndpoint(access_token, `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcaster_id}`, data);
}

async function deleteCustomReward(broadcaster_id, card_id) {

	const store = tokenStore[broadcaster_id];
	if (!store) throw new Error(`No access token for ${broadcaster_id} delete custom rewards`);

	const url = `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcaster_id}&id=${card_id}`;
	return deleteUserAccessEndpoint(store.access_token, url);
}

async function getCustomReward(broadcaster_id) {
	const url = `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcaster_id}`;
	
	const store = tokenStore[broadcaster_id];
	if (!store) throw new Error(`No access token for ${broadcaster_id} get custom rewards`);

	return getUserAccessEndpoint(store.access_token, url);
}

/* User token require ABOVE */

function getTokenStore(channelId) {
	return tokenStore[channelId];
}

function storeTokens(items) {
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (item.authenticated) {
			tokenStore[item.ircTarget] = item.authenticated;
		} else {
			delete tokenStore[item.ircTarget];
		}
	}
}

async function init(app) {
	app.on('connection', (socket) => {
		if (!socket.handshake.headers.referer) return;
		const lastIndex = socket.handshake.headers.referer.lastIndexOf('/');
		const clientName = socket.handshake.headers.referer.substring(lastIndex + 1, socket.handshake.headers.referer.length);

		if (clientName === 'control-panel') {
			socket.emit('login-helix', { name: 'helix', authenticated: channel.user_id });
		}
	});

	return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

module.exports = {
	init,
	authUrl,
	authenticateCode,
	refreshAccessToken,
	storeTokens,
	getTokenStore,
	getUser,
	getUserLogin,
	getUsersByName,
	getUsersByIds,
	getStream,
	getStreamById,
	getUserFollows,
	getGame,
	getCustomReward,
	createCustomReward,
	deleteCustomReward
};