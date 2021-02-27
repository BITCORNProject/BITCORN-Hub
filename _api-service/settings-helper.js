/*
    
*/

"use strict";

const settingsCache = require('./settings-cache');

const OUTPUT_TYPE = {
	rewardEvent: 0,
	tipEvent: 1
};

function shuffleArray(array) {
	array.sort(function () {
		return Math.random() - .5;
	});
	return array;
}

exports.OUTPUT_TYPE = OUTPUT_TYPE;

function convertMinsToMs(minutes) {
	const MINUTES_AS_MILLISECONDS = 60000;
	return +minutes * MINUTES_AS_MILLISECONDS;
}

exports.convertMinsToMs = convertMinsToMs;

exports.transactionsDisabled = function (target) {
	const item = settingsCache.getItem(target);
	return item ? !item.enableTransactions : true;
}

exports.txDisabledOutput = function ({ irc_target, configs }) {
	return { success: false, message: 'Transactions not enabled', irc_target: irc_target, configs: configs };;
}

exports.getChannelCooldown = function (target, cooldown) {
	const item = settingsCache.getItem(target);
	return item ? Math.max(convertMinsToMs(item.txCooldownPerUser), cooldown) : cooldown;
}

exports.getIrcMessageTarget = function (target, irc_out, MESSAGE_TYPE) {
	const item = settingsCache.getItem(target);
	return (item ? item.txMessages : false) || irc_out === MESSAGE_TYPE.irc_whisper ? irc_out : MESSAGE_TYPE.irc_none;
}

exports.txMessageOutput = function (type) {
	const messsages = {
		[OUTPUT_TYPE.rewardEvent]: 'Tx Reward Event Message Send Disabled',
		[OUTPUT_TYPE.tipEvent]: 'Tx Tip Event Message Send Disabled'
	};
	return { success: false, message: messsages[type], error: null, result: null };;
}

exports.getRainAlgorithmResult = function (target, items) {
	const item = settingsCache.getItem(target);
	if (!item) return items;

	return [
		items.filter(x => x),
		shuffleArray(JSON.parse(JSON.stringify(items.filter(x => x))))
	][item.rainAlgorithm];
}

exports.getTipcornMinAmount = function (target, minTipAmount) {
	const item = settingsCache.getItem(target);
	return item ? item.minTipAmount : minTipAmount;
}

exports.getRainMinAmount = function (target, minRainAmount) {
	const item = settingsCache.getItem(target);
	return item ? item.minRainAmount : minRainAmount;
}

exports.getIrcEventPayments = function (target, ircEventPayments) {
	const item = settingsCache.getItem(target);
	return item ? item.ircEventPayments : ircEventPayments;
}

exports.getBitcornhubFunded = function (target, bitcornhubFunded) {
	const item = settingsCache.getItem(target);
	return item ? item.bitcornhubFunded : bitcornhubFunded;
}

exports.getBitcornPerBit = function (target, bitcornPerBit) {
	const item = settingsCache.getItem(target);
	return item ? item.bitcornPerBit : bitcornPerBit;
}

exports.getBitcornPerDonation = function (target, bitcornPerDonation) {
	const item = settingsCache.getItem(target);
	return item ? item.bitcornPerDonation : bitcornPerDonation;
}