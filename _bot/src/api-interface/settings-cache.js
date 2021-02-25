
/*

*/

"use strict";

const databaseAPI = require('./database-api');

const { getUsers } = require('./twitch-api');
const SETTINGS_POLL_INTERVAL_MS = 1000 * 20;// 1000 * 60 * 2;
let cache = {};
let idMap = {};

let interval = null;

/*
{
	"minRainAmount": 1.00000000,
	"minTipAmount": 1.00000000,
	"rainAlgorithm": 0, // 0=last chatters 1=random chatters
	"ircTarget": "#callowcreation",
	"txMessages": true,
	"txCooldownPerUser": 0.00000000,
	"enableTransactions": false,

	ircEventPayments(bool) = enable bit / sub / idle
	bitcornhubFunded(bool) = irc payments through bitcornhub or own wallet
	bitcornPerBit(decimal) = how many corn to send for each bit
	bitcornPerDonation(decimal) = how many corn to send for donation
}
*/

function cleanChannelName(channel) {
	return channel.toLowerCase().replace(/#/g, '');
}

function setItems(items) {
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const channel = cleanChannelName(item.ircTarget);
		if (cache[channel]) continue;
		cache[channel] = item;
	}
}

function getItems() {
	return cache;
}

function clear() {
	cache = {};
}

function getItem(channel) {
	channel = cleanChannelName(channel);
	return cache[channel];
}

async function requestSettings() {
	const results = await databaseAPI.makeRequestChannelsSettings();
	clear();
	setItems(results);
}

async function setChannelsIds(channels) {
	const items = channels.filter(x => x);
	const promises = [];
	while (items.length > 0) {
		const usernames = items.splice(0, 100);
		promises.push(new Promise(async (resolve) => {
			const { data } = await getUsers(usernames.map(x => cleanChannelName(x)));
			resolve(data.map(x => ({ id: x.id, login: x.login })));
		}));
	}
	const presults = await Promise.all(promises);
	const results = [].concat.apply([], presults);

	for (let i = 0; i < results.length; i++) {
		const item = results[i];
		idMap[item.login] = item.id;
	}
}

function startPolling() {
	interval = setInterval(async () => {
		await requestSettings();
	}, SETTINGS_POLL_INTERVAL_MS);
}

async function getChannelId(channel) {
	channel = cleanChannelName(channel);
	if(!idMap[channel]) {
		await setChannelsIds([channel]);
	}
	return idMap[channel];
}

module.exports = {
	cleanChannelName,
	setItems,
	getItems,
	clear,
	getItem,
	requestSettings,
	startPolling,
	getChannelId,
	setChannelsIds
};