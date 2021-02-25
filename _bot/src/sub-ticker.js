"use strict";
const fetch = require('node-fetch');

const auth = require('../settings/auth');
const serverSettings = require('../settings/server-settings');
const databaseAPI = require('./api-interface/database-api');
const { getUsers, getChatters } = require('./api-interface/twitch-api');
const { getChannelId } = require('./api-interface/settings-cache');
const settingsCache = require('./api-interface/settings-cache');

const timeValues = {
	SECOND: 1000,
	MINUTE: 1000 * 60,
};

async function performPayout(channel) {

	let viewers = [];

	const MINUTE_AWARD_MULTIPLIER = serverSettings.MINUTE_AWARD_MULTIPLIER;

	const { chatters: chatters_json } = await getChatters(channel);

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
		const usernames = viewers.splice(0, 100);
		promises.push(new Promise(async (resolve) => {
			const { data } = await getUsers(usernames);
			resolve(data.map(x => x.id));
		}));
	}
	const presults = await Promise.all(promises);
	chatters = [].concat.apply([], presults);

	const channelId = await getChannelId(channel);
	const body = {
		ircTarget: channelId,
		chatters: chatters,
		minutes: MINUTE_AWARD_MULTIPLIER
	};

	return databaseAPI.requestPayout(body);
}

async function init() {

	const MINUTE_AWARD_MULTIPLIER = serverSettings.MINUTE_AWARD_MULTIPLIER;

	setInterval(async () => {
		const channels = Object.keys(settingsCache.getItems());
		const promises = channels.map(performPayout);
		const result = await Promise.all(promises);
		console.log({ result });
	}, timeValues.MINUTE * MINUTE_AWARD_MULTIPLIER);

	return { success: true };
}

module.exports = {
	init,
	performPayout
};