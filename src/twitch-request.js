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

async function getUserExtensions(user_id) {
	return twitchOAuth.getEndpoint(`${HELIX_API_BASE_PATH}/users/extensions?user_id=${user_id}`);
}

async function getUsersByName(usernames) {
	const params = usernames.map(x => `login=${x}`).join('&');
	return twitchOAuth.getEndpoint(`${HELIX_API_BASE_PATH}/users?${params}`);
}

async function getUserById(user_id) {
	return twitchOAuth.getEndpoint(`${HELIX_API_BASE_PATH}/users?id=${user_id}`);
}

async function getUsersByIds(user_ids) {
	const params = user_ids.map(x => `id=${x}`)
	return twitchOAuth.getEndpoint(`${HELIX_API_BASE_PATH}/users?${params.join('&')}`);
}

module.exports = {
	authorizeUrl: twitchOAuth.authorizeUrl,
	authorize,
	getUserById,
	getUsersByIds,
	getUserExtensions,
	getUsersByName
};