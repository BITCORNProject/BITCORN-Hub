/*
    
*/

"use strict";

const settingsCache = require('../api-interface/settings-cache');
const MESSAGE_TYPE = require('./message-type');
const { shuffleArray } = require('./arrays');
const { convertMinsToMs } = require('./math');

const OUTPUT_TYPE = {
	rewardEvent: 0,
	tipEvent: 1
};
exports.OUTPUT_TYPE = OUTPUT_TYPE;

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

exports.getIrcMessageTarget = function (target, irc_out) {
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