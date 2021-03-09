"use strict";
const fetch = require('node-fetch');

const serverSettings = require('../../settings/server-settings.json');
const databaseAPI = require('../../_api-shared/database-api');
const { getUsers, getChatters } = require('./request-api');
const settingsHelper = require('../settings-helper');

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
			try {
				const { data } = await getUsers(usernames);
				resolve(data.map(x => x.id));
			} catch (error) {
				resolve(null);
			}
		}));
	}
	const presults = await Promise.all(promises);
	chatters = [].concat.apply([], presults);

	const channelId = await settingsHelper.getMapChannelId(channel);
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
		const channels = Object.values(settingsHelper.getChannelNames());
		const promises = channels.map(performPayout);
		const result = await Promise.all(promises);
		console.log({ result });
	}, /*1000 * 30 */ timeValues.MINUTE * MINUTE_AWARD_MULTIPLIER);

	return { success: true };
}

module.exports = {
	init,
	performPayout
};