"use strict";

const serverSettings = require('../../settings/server-settings.json');
const databaseAPI = require('../../_api-shared/database-api');
const { getUsers, getChatters, getStreamsByIds } = require('./request-api');
const settingsHelper = require('../settings-helper');

const timeValues = {
	SECOND: 1000,
	MINUTE: 1000 * 60,
};

async function performPayout({ channel, channelId }) {

	if (!settingsHelper.getProperty(channel, 'ircEventPayments')) return { msg: 'idle disabled' };

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
	const chatters = [].concat.apply([], presults);

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
		const items = Object.values(settingsHelper.getChannelsAndIds());
		if (items.length === 0) return;

		const promises = [];
		while (items.length > 0) {
			const item = items.splice(0, 100);
			promises.push(new Promise(async (resolve) => {
				try {
					const { data } = await getStreamsByIds(item.map(x => x.channelId));
					resolve(data.map(x => ({ channel: x.user_login, channelId: x.user_id })));
				} catch (error) {
					resolve(null);
				}
			}));
		}
		const presults = await Promise.all(promises);
		const streams = [].concat.apply([], presults);

		const payoutPromises = streams.map(performPayout);
		const result = await Promise.all(payoutPromises);
		console.log({ result });
	}, /* 1000 * 30 */ timeValues.MINUTE * MINUTE_AWARD_MULTIPLIER);

	return { success: true };
}

module.exports = {
	init,
	performPayout
};