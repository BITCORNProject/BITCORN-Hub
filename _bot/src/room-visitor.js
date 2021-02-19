"use strict";

const fetch = require('node-fetch');
const _ = require('lodash');
const auth = require('../../settings/auth');
const Queue = require('./utils/queue');
const databaseApi = require('./api-interface/database-api');
const apiRequest = require('./api-interface/api-request');
const { sendQueuedRewards } = require('./messenger');

const SETTINGS_JOIN_LEAVE_INTERVAL_MS = 1000 * 60 * 0.5;
const MAX_JOIN_RETRIES = 5;
let retrieCount = 0;
const queuedItems = new Queue();

const joinedChannels = [];


async function partChannels(tmi, leaves) {
	for (let i = 0; i < leaves.length; i++) {
		const result = await tmi.partChannel(leaves[i]);
		console.log({ left_channel: result.join() });
	}
}

async function joinChannels(tmi, channel) {
	const result = await tmi.joinChannel(channel);
	return result.join();
}

function addChannels(channels) {
	channels = channels.filter(x => !joinedChannels.includes(x));
	for (let i = 0; i < channels.length; i++) {
		queuedItems.enqueue(channels[i]);
	}
}

function getJoinQueue() {
	return queuedItems;
}

async function joinChannelsFromQueue(tmi) {

	if (queuedItems.size() === 0) return { message: 'Empty Queue' };

	const item = queuedItems.peek();

	let result = null;
	try {
		const joined = await joinChannels(tmi, item);
		retrieCount = 0;
		queuedItems.dequeue();

		joinedChannels.push(item);

		result = { message: joined };
	} catch (error) {
		retrieCount++;
		if (retrieCount === MAX_JOIN_RETRIES) {
			queuedItems.dequeue();
			result = { message: error.message };
		}
	}
	joinChannelsFromQueue(tmi);

	console.log(result);

	await new Promise(resolve => setTimeout(resolve, 500));
	return result;
}

module.exports = async (tmi) => {

	try {

		const channels = await databaseApi.makeRequestChannels();
		addChannels(channels);
		joinChannelsFromQueue(tmi);

	} catch (error) {
		console.log(error);
	}

	setInterval(async () => {
		try {
			const channels = await databaseApi.makeRequestChannels();

			const leaves = _.difference(joinedChannels, channels);
			const joins = _.difference(channels, joinedChannels);

			await partChannels(tmi, leaves);

			addChannels(joins);
			joinChannelsFromQueue(tmi);
			
		} catch (error) {
			console.log(error);
		}
		
	}, SETTINGS_JOIN_LEAVE_INTERVAL_MS);

	return { addChannels, getJoinQueue, joinChannelsFromQueue };
};