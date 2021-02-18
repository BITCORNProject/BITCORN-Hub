/*
    
*/

"use strict";

const settingsCache = require('../api-interface/settings-cache');
const math = require('./math');

exports.transactionsDisabled = function (target) {
	const item = settingsCache.getItem(target);
	return item ? !item.enableTransactions : true;
}

exports.disabledOutput = function ({ irc_target, configs }) {
	return { success: false, message: 'Transactions not enabled', irc_target: irc_target, configs: configs };;
}

exports.getChannelCooldown = function (target, cooldown) {
	const item = settingsCache.getItem(target);
	return item ? Math.max(math.convertMinsToMs(item.txCooldownPerUser), cooldown) : cooldown;
}