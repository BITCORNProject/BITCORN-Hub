"use strict";

const crypto = require('crypto');
const TwitchOAuth = require('@callowcreation/basic-twitch-oauth');

const HELIX_API_BASE_PATH = 'https://api.twitch.tv/helix';

const buffer = crypto.randomBytes(16);
const state = buffer.toString('hex');

const twitchOAuth = new TwitchOAuth({
	client_id: process.env.HELIX_CLIENT_ID,
	client_secret: process.env.HELIX_SECRET,
	redirect_uri: process.env.HELIX_CALLBACK_URL,
	scopes: [
		'user:edit:broadcast',
		'user:edit',
		'user:read:email',
		'analytics:read:games',
		'bits:read',
		'channel:read:redemptions',
		'channel:manage:redemptions'
	]
}, state);

async function authorize(code, state) {
	twitchOAuth.confirmState(state);
	await twitchOAuth.fetchToken(code);
}

async function getUsersByName(usernames) {
	const params = usernames.map(x => `login=${x}`).join('&');
	return twitchOAuth.getEndpoint(`${HELIX_API_BASE_PATH}/users?${params}`);
}

async function getUsersByIds(user_ids) {
	const params = user_ids.map(x => `id=${x}`);
	return twitchOAuth.getEndpoint(`${HELIX_API_BASE_PATH}/users?${params.join('&')}`);
}

const tokenStore = {};

/**
 * throws if the broadcaster_id does not have an access token
 */
async function createCustomReward(broadcaster_id, data) {
	const store = tokenStore[broadcaster_id];
	if (!store.access_token) throw new Error(`No access token for ${broadcaster_id} create custom rewards`);

	const client_id = process.env.API_CLIENT_ID;
	const url = `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcaster_id}`;
	const options = {
		method: 'POST',
		body: JSON.stringify(data)
	};
	return twitchOAuth.fetchEndpointWithCredentials(client_id, store.access_token, url, options);
}

async function deleteCustomReward(broadcaster_id, card_id) {
	const store = tokenStore[broadcaster_id];
	if (!store) throw new Error(`No access token for ${broadcaster_id} delete custom rewards`);

	const client_id = process.env.API_CLIENT_ID;
	const url = `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcaster_id}&id=${card_id}`;
	const options = {
		method: 'DELETE'
	};
	return twitchOAuth.fetchEndpointWithCredentials(client_id, store.access_token, url, options);
}

async function getCustomReward(broadcaster_id) {
	const store = tokenStore[broadcaster_id];
	if (!store) throw new Error(`No access token for ${broadcaster_id} get custom rewards`);

	const client_id = process.env.API_CLIENT_ID;
	const url = `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcaster_id}`;
	const options = {
		method: 'GET'
	};
	return twitchOAuth.fetchEndpointWithCredentials(client_id, store.access_token, url, options);
}

async function refreshAccessToken({ refresh_token, client_id, client_secret }) {
	return twitchOAuth.fetchRefreshTokenWithCredentials(client_id, client_secret, refresh_token);
}

/* User token require ABOVE */

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

function getTokenStore(channelId) {
	return tokenStore[channelId];
}

module.exports = {
	authorizeUrl: twitchOAuth.authorizeUrl,
	authorize,
	getUsersByIds,
	getUsersByName,
	refreshAccessToken,
	storeTokens,
	getTokenStore,
	createCustomReward,
	deleteCustomReward,
	getCustomReward
};