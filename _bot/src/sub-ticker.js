"use strict";
const fetch = require('node-fetch');

const serverSettings = require('../settings/server-settings');
const databaseAPI = require('./api-interface/database-api');
const twitchAPI = require('./api-interface/twitch-api');
const errorLogger = require('./utils/error-logger');

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
		promises.push(new Promise(async (resolve, reject) => {
			const users = await twitchAPI.getUsersId(chunked);
			if (users.error) {
				reject(users);
			} else if (users) {
				resolve(users.map(x => x.id));
			}
		}));
	}

	const presults = await Promise.all(promises)
		.catch(e => e);

	if(presults.error) {
		console.log(presults.error);
		return errorLogger.asyncErrorLogger(presults.error, 0);
	}

	chatters = [].concat.apply([], presults);

	if (chatters.length > 0) {
		const body = {
			chatters: chatters,
			minutes: MINUTE_AWARD_MULTIPLIER
		};
		const { id: senderId } = await twitchAPI.getUserId(process.env.BOT_USERNAME);

		return databaseAPI.requestPayout(senderId, body);
	}
	return null;
}

async function init() {

	const MINUTE_AWARD_MULTIPLIER = 0.5;// serverSettings.MINUTE_AWARD_MULTIPLIER;

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