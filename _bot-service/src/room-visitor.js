"use strict";

const _ = require('lodash');
const Queue = require('./utils/queue');
const databaseApi = require('../../_api-shared/database-api');
const settingsHelper = require('../settings-helper');
const { getIds } = require('./request-api');

const SETTINGS_JOIN_LEAVE_INTERVAL_MS = 1000 * 60 * 2;
const MAX_JOIN_RETRIES = 5;
let retrieCount = 0;

const joinedChannels = [];
const nameChangeChannelMap = {};

function _Queue() {
	this.items = new Queue();
	this.isBusy = false;
	this.attempts = 0;

	this.size = function () { return this.items.size(); }
	this.peek = function () { return this.items.peek(); }
	this.enqueue = function (item) { return this.items.enqueue(item); }
	this.dequeue = function () { return this.items.dequeue(); }
	this.replace = function (index, value ) { this.items.items.splice(index, 1, value); }
}

const queuedItems = new _Queue();

async function partChannels(tmi, leaves) {
	if (leaves.length === 0) return;
	for (let i = 0; i < leaves.length; i++) {
		const result = await tmi.partChannel(leaves[i]);
		console.log({ left_channel: result.join() });
	}
	const items = joinedChannels.filter(x => !leaves.includes(x));
	joinedChannels.splice(0);
	joinedChannels.push(...items);
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

	if (queuedItems.isBusy === true) return { message: `join queue is busy with size: ${queuedItems.size()}` };

	queuedItems.isBusy = true;

	await new Promise(resolve => setTimeout(resolve, 500));

	const item = queuedItems.peek();

	let result = null;
	try {
		const joined = await joinChannels(tmi, item);
		//console.log({ joined });
		retrieCount = 0;
		queuedItems.dequeue();

		joinedChannels.push(item);

		result = { message: joined };
	} catch (error) {
		retrieCount++;

		if (error === 'msg_banned' || error === 'msg_channel_suspended') {
			queuedItems.dequeue();
			retrieCount = 0;
			result = { message: error, item, maxRetries: true };
		} else if (error === 'No response from Twitch.') {

			const channel_id = settingsHelper.getProperty(item, 'ircTarget');
			const { data } = await getIds([channel_id]);
			// console.log(data);

			nameChangeChannelMap[item] = data[0].login;
			queuedItems.replace(0, data[0].login);

			result = { message: error, item, maxRetries: false };

		} else {
			if (retrieCount === MAX_JOIN_RETRIES) {
				queuedItems.dequeue();
				retrieCount = 0;
				result = { message: error, item, maxRetries: true };
			} else {
				result = { message: error, item, maxRetries: false };
			}
		}
	}

	queuedItems.isBusy = false;

	joinChannelsFromQueue(tmi);

	console.log({ result, timestamp: new Date().toLocaleTimeString() });

	return result;
}

module.exports = async (tmi) => {

	try {

		const channels = await databaseApi.makeRequestChannels();

		// // ----- REMOVE TEST CODE
		// channels.push('likeweedtv420');
		// // ----- REMOVE TEST CODE

		addChannels(channels);
		joinChannelsFromQueue(tmi);

	} catch (error) {
		console.error(error);
	}

	setInterval(async () => {
		try {
			let channels = await databaseApi.makeRequestChannels();

			// // ----- REMOVE TEST CODE
			// channels.push('likeweedtv420');
			// // ----- REMOVE TEST CODE

			channels = channels.map(x => {
				if(Object.keys(nameChangeChannelMap).includes(x)) {
					return nameChangeChannelMap[x];
				}
				return x;
			});

			const leaves = _.difference(joinedChannels, channels);
			const joins = _.difference(channels, joinedChannels);

			await partChannels(tmi, leaves);

			addChannels(joins);
			joinChannelsFromQueue(tmi);

		} catch (error) {
			console.error(error);
		}

	}, SETTINGS_JOIN_LEAVE_INTERVAL_MS);

	return { addChannels, getJoinQueue, joinChannelsFromQueue };
};