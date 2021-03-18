"use strict";

const crypto = require('crypto');
const TwitchOAuth = require('@callowcreation/basic-twitch-oauth');

const HELIX_API_PATH = 'https://api.twitch.tv/helix';

const buffer = crypto.randomBytes(16);
const state = buffer.toString('hex');

const tokenStore = {};

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
	return twitchOAuth.getEndpoint(`${HELIX_API_PATH}/users?${params}`);
}

async function getUsersByIds(user_ids) {
	const params = user_ids.map(x => `id=${x}`);
	return twitchOAuth.getEndpoint(`${HELIX_API_PATH}/users?${params.join('&')}`);
}

async function getStreamsByIds(user_ids) {
	const params = user_ids.map(x => `user_id=${x}`);
	return twitchOAuth.getEndpoint(`${HELIX_API_PATH}/streams?${params.join('&')}`);
}

function tokenOrThrow(broadcaster_id) {
	const store = getTokenStore(broadcaster_id);
	if (!store) throw new Error(`No access token for ${broadcaster_id} custom rewards`);
	return store;
}

async function refreshOrValidateStore(broadcaster_id) {
	let store = tokenOrThrow(broadcaster_id);

	if (twitchOAuth.refreshTokenNeeded(store)) {
		const authenticated = await refreshAccessToken({
			refresh_token: store.refresh_token,
			client_id: process.env.API_CLIENT_ID,
			client_secret: process.env.API_SECRET
		});
		storeTokens([{ authenticated, ircTarget: broadcaster_id }]);
				
		store = getTokenStore(broadcaster_id);
	} else {
		const d = new Date();
		const time = d.getTime();
		const secondsInHour = 3600;
		const next_validation_ms = store.last_validated + (secondsInHour * 1000);
		
		if (time > next_validation_ms) {
			const validate = await twitchOAuth.validateWithCredentials(process.env.API_CLIENT_ID, store.access_token);
			console.log({ validate });

			store.last_validated = time;
		}
	}
	return store;
}

/**
 * throws if the broadcaster_id does not have an access token
 */
async function createCustomReward(broadcaster_id, data) {
	const store = await refreshOrValidateStore(broadcaster_id);

	const url = `${HELIX_API_PATH}/channel_points/custom_rewards?broadcaster_id=${broadcaster_id}`;
	const options = {
		method: 'POST',
		body: JSON.stringify(data)
	};
	return twitchOAuth.fetchEndpointWithCredentials(process.env.API_CLIENT_ID, store.access_token, url, options);
}

async function deleteCustomReward(broadcaster_id, card_id) {
	const store = await refreshOrValidateStore(broadcaster_id);

	const url = `${HELIX_API_PATH}/channel_points/custom_rewards?broadcaster_id=${broadcaster_id}&id=${card_id}`;
	const options = {
		method: 'DELETE'
	};
	return twitchOAuth.fetchEndpointWithCredentials(process.env.API_CLIENT_ID, store.access_token, url, options);
}

async function getCustomRewards(broadcaster_id) {
	const store = await refreshOrValidateStore(broadcaster_id);

	const url = `${HELIX_API_PATH}/channel_points/custom_rewards?broadcaster_id=${broadcaster_id}`;
	const options = {
		method: 'GET'
	};
	return twitchOAuth.fetchEndpointWithCredentials(process.env.API_CLIENT_ID, store.access_token, url, options);
}

// status = FULFILLED or CANCELED
async function updateRedemptionStatus({ broadcaster_id, redemption_id, reward_id, status }) {
	const store = await refreshOrValidateStore(broadcaster_id);

	const searchParamsEntries = [
		['broadcaster_id', broadcaster_id],
		['id', redemption_id],
		['reward_id', reward_id]
	];
	const searchParams = new URLSearchParams(searchParamsEntries);
	const urlQuery = searchParams.toString();

	const url = `${HELIX_API_PATH}/channel_points/custom_rewards/redemptions?${urlQuery}`;
	const options = {
		method: 'PATCH',
		body: JSON.stringify({ status })
	};
	return twitchOAuth.fetchEndpointWithCredentials(process.env.API_CLIENT_ID, store.access_token, url, options);
}

async function refreshAccessToken({ refresh_token, client_id, client_secret }) {
	return twitchOAuth.fetchRefreshTokenWithCredentials(client_id, client_secret, refresh_token);
}

/* User token require ABOVE */

function storeTokens(items) {
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (item.authenticated) {
			tokenStore[item.ircTarget] = twitchOAuth.makeAuthenticated(item.authenticated);
		} else {
			delete tokenStore[item.ircTarget];
		}
	}
}

function getTokenStore(channelId) {
	return tokenStore[channelId];
}

function getTokenAllStores() {
	return tokenStore;
}

module.exports = {
	authorizeUrl: twitchOAuth.authorizeUrl,
	authorize,
	getUsersByIds,
	getUsersByName,
	getStreamsByIds,
	refreshAccessToken,
	storeTokens,
	getTokenStore,
	getTokenAllStores,
	createCustomReward,
	deleteCustomReward,
	getCustomRewards,
	updateRedemptionStatus
};