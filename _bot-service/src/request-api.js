
/*

*/

"use strict";

require('dotenv').config({ path: __dirname + '/./../.env' });

const fetch = require('node-fetch');

const localUrl = `http://localhost:${process.env.TWITCH_SERVER_PORT}`;

async function getRequest(url) {
	return fetch(url)
	.then(res => res.json())
	.catch(err => err);
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