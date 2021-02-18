/*
    
*/

"use strict";

const settingsCache = require('../api-interface/settings-cache');

exports.transactionsDisabled = function (target) {
	const item = settingsCache.getItem(target);
	return item ? !item.enableTransactions : true;
}

exports.disabledOutput = function ({ irc_target, configs }) {
	return { success: false, message: 'Transactions not enabled', irc_target: irc_target, configs: configs };;
}