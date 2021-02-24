
/*

*/

"use strict";

const databaseAPI = require('./database-api');
const SETTINGS_POLL_INTERVAL_MS = 1000 * 20;// 1000 * 60 * 2;
let cache = {};

/*
{
	"minRainAmount": 1.00000000,
	"minTipAmount": 1.00000000,
	"rainAlgorithm": 0, // 0=last chatters 1=random chatters
	"ircTarget": "#callowcreation",
	"txMessages": true,
	"txCooldownPerUser": 0.00000000,
	"enableTransactions": false
}
*/
function cleanChannelName(channel) {
	return channel.toLowerCase().replace(/#/g, '');
}

function setItems(items) {
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const channel = cleanChannelName(item.ircTarget);
		if(cache[channel]) continue;
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

let interval = null;

function startPolling() {
	interval = setInterval(async () => {
		await requestSettings();
	}, SETTINGS_POLL_INTERVAL_MS);
}

module.exports = {
	setItems,
	getItems,
	clear,
	getItem,
	requestSettings,
	startPolling
};