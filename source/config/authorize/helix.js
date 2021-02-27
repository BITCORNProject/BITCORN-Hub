/*

*/

"use strict";

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const auth = require('../../../settings/auth');
const pubsub = require('../pubsub');

const databaseAPI = require('../../../_api-service/database-api');

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

	appOptions.client_id = auth.HELIX_CLIENT_ID;
	appOptions.client_secret = auth.HELIX_SECRET;
	appOptions.redirect_uri = auth.HELIX_CALLBACK_URL;

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

	
	
	

	try {
		
		const data = await databaseAPI.makeRequestChannelsSettings();
		//console.log(data);

		const promises = [];

		for (const channel in data) {

			const { twitchRefreshToken, ircTarget } = data[channel];

			promises.push(new Promise(async resolve => {

				const requestToken = await refreshAccessToken({
					refresh_token: twitchRefreshToken,
					client_id: auth.API_CLIENT_ID,
					client_secret: auth.API_SECRET
				});

				const authenticated = twitchRefreshToken ? requestToken : {
					access_token: null,
					refresh_token: null,
					expires_in: 0,
					scope: null,
					token_type: null
				};

				resolve({ authenticated, ircTarget });
			}));
		}

		const items = await Promise.all(promises);

		storeTokens(items.map(({ authenticated, ircTarget }) => ({ authenticated, ircTarget })));

		await pubsub.connect();

		for (let i = 0; i < items.length; i++) {
			const { authenticated, ircTarget: channelId } = items[i];

			// if settings channel point redemption is enabled
			const data = {
				title: 'BITCORNx420-TEST', // maybe title in dashboard settings
				cost: 420, // to be replaced by dashboard settings from the api
				prompt: `Must be sync'd with BITCORNfarms in order to receive reward. 100:1 ratio.`,
				should_redemptions_skip_request_queue: true
			};
			const result = await createCustomReward(channelId, data);
			// if settings channel point redemption is enabled

			if (authenticated.access_token) {
				pubsub.listen(`channel-points-channel-v1.${channelId}`, authenticated.access_token);
				console.log(`listening: ${channelId}`);
			} else {
				console.log({ result });
			}
		}

		// make sure these are sent back to the api
		const response = await databaseAPI.sendTokens(items.map(({ authenticated: { refresh_token }, ircTarget }) => ({ refreshToken: refresh_token, ircTarget })));
		console.log({response});
	} catch (err) {

		console.error(err);
	}

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

async function postRawEndpoint(url, data) {
	const options = getAuthorizedOptions(appOptions.client_id, authenticated.access_token);
	options.method = 'POST';
	if(data) {
		options.body = JSON.stringify(data);
	}
    return fetch(url, options)
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

async function createCustomReward(broadcaster_id, data) {
	return postRawEndpoint(`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcaster_id}`, data);
}

function getTokenStore(channelId) {
	return tokenStore[channelId];
}

function storeTokens(items) {
	for (const key in items) {
		const item = items[key];
		tokenStore[item.ircTarget] = item.authenticated;
	}
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
	createCustomReward
};