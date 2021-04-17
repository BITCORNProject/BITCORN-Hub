"use strict";

const databaseAPI = require('../../_api-shared/database-api');
const { getUsers, getChatters, getStreamsByIds } = require('./request-api');
const settingsHelper = require('../settings-helper');

const timeValues = {
	SECOND: 1000,
	MINUTE: 1000 * 60,
};

async function chunkRequests(stack, requester, mapper) {
	const promises = [];
	while (stack.length > 0) {
		const chunk = stack.splice(0, 100);
		const promise = requester(chunk)
			.then(({ data }) => data.map(mapper))
			.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
		promises.push(promise);
	}
	const resolved = await Promise.all(promises);
	const results = [].concat.apply([], resolved);
	return results;
}

async function getChannelChatters(channel) {
	const { chatters: chatters_json } = await getChatters(channel);
	const stack = [];
	for (const key in chatters_json) {
		if (key === 'broadcaster') continue;
		stack.push(...chatters_json[key]);
	}
	return stack;
}

async function performPayout({ channel, channelId }) {

	if (!settingsHelper.getProperty(channel, 'ircEventPayments')) return { msg: 'idle disabled' };

	const stack = await getChannelChatters(channel);
	const results = await chunkRequests(stack, getUsers, x => x.id);

	const body = {
		ircTarget: channelId,
		chatters: results,
		minutes: process.env.MINUTE_AWARD_MULTIPLIER
	};

	return databaseAPI.requestPayout(body);
}

async function init() {

	setInterval(async () => {
		const stack = Object.values(settingsHelper.getChannelsAndIds());
		if (stack.length === 0) return;

		const requester = async chunk => getStreamsByIds(chunk.map(x => x.channelId));
		//const requester = async chunk => ({ data: chunk.map(x => ({ user_login: x.channel, user_id: x.channelId })) });
		const mapper = x => ({ channel: x.user_login, channelId: x.user_id });
		const results = await chunkRequests(stack, requester, mapper);

		const payoutPromises = results.map(performPayout);
		const result = await Promise.all(payoutPromises);
		if (result.length && result.length > 0) {
			console.log({ result });
		} else if (!result.hasOwnProperty('length')) {
			console.log({ 'sub-ticker-ERROR': result });
		}
	}, /* 1000 * 30 */timeValues.MINUTE * process.env.MINUTE_AWARD_MULTIPLIER);

	return { success: settingsHelper.getChannelNames().length > 0 };
}

module.exports = {
	init,
	getChannelChatters,
	chunkRequests,
	performPayout
};