
/*

*/

"use strict";

const fetch = require('node-fetch');

const auth = require('../../settings/auth');

const localUrl = `http://localhost:${auth.PORT}`;

async function getRequest(url) {
	return fetch(url)
		.then(res => res.json())
		.catch(err => console.error(err));
}

async function postRequest(url, data) {
	const options = {
		headers: {
			'Content-Type': 'application/json'
		},
		method: 'POST',
		body: JSON.stringify(data)
	};
	return fetch(url, options)
		.then(res => res.json())
		.catch(err => console.error(err));
}

async function getUsers(usernames) {
	return postRequest(`${localUrl}/users`, { usernames });
}

async function getUsersByIds(ids) {
	return postRequest(`${localUrl}/users`, { ids });
}

async function getChatters(channel) {
	return getRequest(`https://tmi.twitch.tv/group/user/${channel}/chatters`);
}

async function sendSettingsCache(data) {
	return postRequest(`${localUrl}/tokens`, data);
}

module.exports = {
	getUsers,
	getUsersByIds,
	getChatters,
	sendSettingsCache
};