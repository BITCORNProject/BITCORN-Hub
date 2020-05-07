"use strict";
const fetch = require('node-fetch');

const auth = require('../settings/auth');
const serverSettings = require('../settings/server-settings');
const databaseAPI = require('./api-interface/database-api');

const timeValues = {
	SECOND: 1000,
	MINUTE: 1000 * 60,
};

async function performPayout(channel) {

	let viewers = [];

	const MINUTE_AWARD_MULTIPLIER = serverSettings.MINUTE_AWARD_MULTIPLIER;

	const url = `https://tmi.twitch.tv/group/user/${channel}/chatters`;

	const chatters_result = await fetch(url);
	const chatters_json = await chatters_result.json();

	viewers = [];
	for (const key in chatters_json) {
		const chatters = chatters_json[key];
		for (const k in chatters) {
			if (k === 'broadcaster') continue;
			viewers = viewers.concat(chatters[k]);
		}
	}
	
	const promises = [];
	let chatters = [];
	while (viewers.length > 0) {
		const chunked = viewers.splice(0, 100);
		promises.push(new Promise(async (resolve) => {
			const usernames = chunked.join(',');
			const users = await fetch(`http://localhost:${auth.PORT}/users?usernames=${usernames}`).then(res => res.json());
			resolve(users.result.users.map(x => x._id));
		}));
	}
	const presults = await Promise.all(promises);
	chatters = [].concat.apply([], presults);

	const body = {
		chatters: chatters,
		minutes: MINUTE_AWARD_MULTIPLIER
	};
	const { result: { users: [{ _id: senderId }] } } = await fetch(`http://localhost:${auth.PORT}/users?usernames=${auth.BOT_USERNAME}`).then(res => res.json());

	return databaseAPI.requestPayout(senderId, body);
}

async function init() {

	const MINUTE_AWARD_MULTIPLIER = serverSettings.MINUTE_AWARD_MULTIPLIER;

	setInterval(async () => {
		const channel = auth.CHANNEL_NAME.split(',')[0];
		const result = await performPayout(channel);
		console.log({ result });

	}, timeValues.MINUTE * MINUTE_AWARD_MULTIPLIER);

	return { success: true };
}

module.exports = {
	init,
	performPayout
};