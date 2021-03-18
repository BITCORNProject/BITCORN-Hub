
/*

*/

"use strict";

require('dotenv').config({ path: __dirname + '/./../.env' });

const fetch = require('node-fetch');

const localUrl = `http://localhost:${process.env.TWITCH_SERVER_PORT}`;

function fetchRequest(url, options) {
	return fetch(url, options)
		.then(res => res.json())
		.catch(err => console.error(err));
}

async function getRequest(url) {
	return fetchRequest(url, { method: 'GET' });
}

async function postRequest(url, data) {
	const options = {
		headers: {
			'Content-Type': 'application/json'
		},
		method: 'POST',
		body: JSON.stringify(data)
	};
	return fetchRequest(url, options);
}

async function getUsers(usernames) {
	return postRequest(`${localUrl}/users`, { usernames });
}

async function getIds(ids) {
	return postRequest(`${localUrl}/users`, { ids });
}

async function getStreamsByIds(ids) {
	return postRequest(`${localUrl}/streams`, { ids });
}

async function getChatters(channel) {
	return getRequest(`https://tmi.twitch.tv/group/user/${channel}/chatters`);
}

module.exports = {
	getUsers,
	getIds,
	getStreamsByIds,
	getChatters
};