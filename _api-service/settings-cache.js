
/*

*/

"use strict";

const databaseAPI = require('./database-api');

let cache = {};
let idMap = {};

const initialValues = [];

/*
{
	"minRainAmount": 1.00000000,
	"minTipAmount": 1.00000000,
	"rainAlgorithm": 0, // 0=last chatters 1=random chatters
	"ircTarget": "75987197",
	"txMessages": true,
	"txCooldownPerUser": 0.00000000,
	"enableTransactions": false,

	ircEventPayments(bool) = enable bit / sub / idle
	bitcornhubFunded(bool) = irc payments through bitcornhub or own wallet
	bitcornPerBit(decimal) = how many corn to send for each bit
	bitcornPerDonation(decimal) = how many corn to send for donation

	bitcornPerChannelpointsRedemption(decimal)
	enableChannelpoints(bool)


	bitcornhubFunded: true
	bitcornPerBit: 321.00
	bitcornPerChannelpointsRedemption: 0.4
	bitcornPerDonation: 123.00
	enableChannelpoints: true
	enableTransactions: true
	ircEventPayments: true
	ircTarget: "120524051"
	minRainAmount: 1.00000000
	minTipAmount: 1.0000000
	rainAlgorithm: 1 		// 0=last chatters 1=random chatters
	twitchRefreshToken: ""
	twitchUsername: ""
	txCooldownPerUser: 0.00
	txMessages: true
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
		initialValues.push(item);
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
	const channelId = idMap[channel];
	return cache[channelId];
}

async function requestSettings() {
	
	const results = await databaseAPI.makeRequestChannelsSettings();

	clear();
	setItems(results);

	for (let i = 0; i < initialValues.length; i++) {
		const item = initialValues[i];
		idMap[item.twitchUsername] = item.ircTarget;
	}
}

function getChannelId(channel) {
	channel = cleanChannelName(channel);
	return idMap[channel];
}

function getChannels() {
	return Object.keys(idMap);
}

module.exports = {
	cleanChannelName,
	setItems,
	getItems,
	clear,
	getItem,
	requestSettings,
	getChannelId,
	getChannels
};