"use strict";
const fetch = require('node-fetch');

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
			const user_logins = chunked.map(x => `login=${x}`).join('&');
			const result = await fetch(`http://localhost:${process.env.PORT}/users?${user_logins}`).then(res => res.json());
			if(result.error) {
				resolve([]);
			} else {
				resolve(result.data.map(x => x.id));
			}
		}));
	}
	
	const presults = await Promise.all(promises);
	chatters = [].concat.apply([], presults);

	if(chatters.length > 0) {
		const body = {
			chatters: chatters,
			minutes: MINUTE_AWARD_MULTIPLIER
		};
		const  { data: [{ id: senderId }] } = await fetch(`http://localhost:${process.env.PORT}/users?usernames=${process.env.BOT_USERNAME}`).then(res => res.json());
	
		return databaseAPI.requestPayout(senderId, body);
	}
	return null;
}

async function init() {

	const MINUTE_AWARD_MULTIPLIER = serverSettings.MINUTE_AWARD_MULTIPLIER;

	setInterval(async () => {
		const channel = process.env.CHANNEL_NAME.split(',')[0];
		const result = await performPayout(channel);
		console.log({ result });

	}, timeValues.MINUTE * MINUTE_AWARD_MULTIPLIER);

	return { success: true };
}

module.exports = {
	init,
	performPayout
};