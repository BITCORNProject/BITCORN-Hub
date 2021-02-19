/*
    
*/

"use strict";

const settingsCache = require('../api-interface/settings-cache');
const MESSAGE_TYPE = require('./message-type');
const math = require('./math');

exports.transactionsDisabled = function (target) {
	const item = settingsCache.getItem(target);
	return item ? !item.enableTransactions : true;
}

exports.txDisabledOutput = function ({ irc_target, configs }) {
	return { success: false, message: 'Transactions not enabled', irc_target: irc_target, configs: configs };;
}

exports.getChannelCooldown = function (target, cooldown) {
	const item = settingsCache.getItem(target);
	return item ? Math.max(math.convertMinsToMs(item.txCooldownPerUser), cooldown) : cooldown;
}

exports.getIrcMessageTarget = function (target, irc_out) {
	const item = settingsCache.getItem(target);
	return (item ? item.txMessages : false) || irc_out === MESSAGE_TYPE.irc_whisper ? irc_out : MESSAGE_TYPE.irc_none;
}

exports.txMessageOutput = function () {
	return { success: false, message: 'Tx Message Send Disabled', error: null, result: null };;
}