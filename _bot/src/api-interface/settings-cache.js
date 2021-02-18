
/*

*/

"use strict";

const databaseAPI = require('./database-api');

let cache = {};

/*
{
	"minRainAmount": 1.00000000,
	"minTipAmount": 1.00000000,
	"rainAlgorithm": 0,
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

module.exports = {
	setItems,
	getItems,
	clear,
	getItem,
	requestSettings
};