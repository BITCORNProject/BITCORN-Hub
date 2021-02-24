
/*

*/

"use strict";

const fetch = require('node-fetch');

const auth = require('../../settings/auth');

async function getRequest(url) {
	return fetch(url)
		.then(res => res.json())
		.catch(err => console.log(err));
}

async function getUsers(usernames) {
	return getRequest(`http://localhost:${auth.PORT}/users?usernames=${usernames.join()}`);
}

async function getChatters(channel) {
	return getRequest(`https://tmi.twitch.tv/group/user/${channel}/chatters`);
}

module.exports = {
	getUsers,
	getChatters
};