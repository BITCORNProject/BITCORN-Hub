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

	let stack = [];

	const MINUTE_AWARD_MULTIPLIER = serverSettings.MINUTE_AWARD_MULTIPLIER;

	const { chatters: chatters_json } = await getChatters(channel);

	stack = [];
	for (const key in chatters_json) {
		const chatters = chatters_json[key];
		for (const k in chatters) {
			if (k === 'broadcaster') continue;
			stack = stack.concat(chatters[k]);
		}
	}

	const requester = async chunk => getUsers(chunk);
	const mapper = x => x.id;
	const results = await chunkRequests(stack, requester, mapper);

	const body = {
		ircTarget: channelId,
		chatters: results,
		minutes: MINUTE_AWARD_MULTIPLIER
	};

	return databaseAPI.requestPayout(body);
}

async function init() {

	const MINUTE_AWARD_MULTIPLIER = serverSettings.MINUTE_AWARD_MULTIPLIER;

	setInterval(async () => {
		const stack = Object.values(settingsHelper.getChannelsAndIds());
		if (stack.length === 0) return;

		const requester = async chunk => getStreamsByIds(chunk.map(x => x.channelId));
		//const requester = async chunk => ({ data: chunk.map(x => ({ user_login: x.channel, user_id: x.channelId })) });
		const mapper = x => ({ channel: x.user_login, channelId: x.user_id });
		const results = await chunkRequests(stack, requester, mapper);

		const payoutPromises = results.map(performPayout);
		const result = await Promise.all(payoutPromises);
		console.log({ result });
	}, /* 1000 * 30 */timeValues.MINUTE * MINUTE_AWARD_MULTIPLIER);

	return { success: settingsHelper.getChannelNames().length > 0 };
}

module.exports = {
	init,
	performPayout
};

async function chunkRequests(stack, requester, mapper) {
	const promises = [];
	while (stack.length > 0) {
		const chunk = stack.splice(0, 100);
		const promise = requester(chunk).then(({ data }) => data.map(mapper)).catch(e => console.log(e));
		promises.push(promise);
	}
	const resolved = await Promise.all(promises);
	const results = [].concat.apply([], resolved);
	return results;
}
