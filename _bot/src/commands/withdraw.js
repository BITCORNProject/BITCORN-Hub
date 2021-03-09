/*

*/

"use strict";

const databaseAPI = require('../../../_api-shared/database-api');
const cleanParams = require('../utils/clean-params');
const MESSAGE_TYPE = require('../utils/message-type');
const settingsHelper = require('../../settings-helper');

module.exports = {
	configs: {
		name: 'withdraw',
		cooldown: 20,
		global_cooldown: false,
		description: 'Withraw your funds off the bot :: Commands do not work in Direct Messages',
		example: '$withdraw <amount> <address>',
		enabled: true,
		irc_in: MESSAGE_TYPE.irc_whisper,
		irc_out: MESSAGE_TYPE.irc_whisper
	},
	async execute(event) {

		let success = false;
		let message = 'Command failed';
		let irc_target = event.irc_target;

		if (settingsHelper.transactionsDisabled(event.channel)) return settingsHelper.txDisabledOutput({ irc_target, configs: this.configs });

		const amount = cleanParams.amount(event.args.params[0]);
		//IMPORTANT: Do not .toLowerCase() the address is case sensitive
		const cornaddy = event.args.params[1];
		if (cleanParams.isNumber(amount) === false ||
			amount <= 0 ||
			amount >= databaseAPI.MAX_WALLET_AMOUNT) {

			message = 'Invalid input';
		} else {
			const body = {
				id: `twitch|${event.twitchId}`,
				cornaddy: cornaddy,
				amount: amount,
				columns: ['balance', 'tipped', 'twitchusername']
			};

			const result = await databaseAPI.request(event.twitchId, body).withdraw();

			if (result.status && result.status === 500) {
				// NOTE needs to be logged to the locally as an error
				message = `${message}: ${result.status} ${result.statusText}`;
			} else if (result.status && result.status === 420) {
				message = `API access locked for ${event.twitchId}`;
			} else if (result.status) {
				message = `${message}: ${result.status} ${result.statusText}`;
			} else if (!result.userid) {
				message = `You failed to withdraw: you need to register by visiting the sync site https://bitcornfarms.com/ to use withdraw`;
				success = true;
			} else {
				if(result.walletavailable === false) {
					success = true;
					message = 'Wallet is down for maintenance';
				} else if(result.usererror === true) {
					success = true;
					message = 'Invalid BITCORN address';
				} else if (result.txid) {
					success = true;
					message = `You have successfully withdrawn BITCORN off of your Twitch Wallet Address: https://www.coinexplorer.net/CORN/transaction/${result.txid}`;
				} else if(result.balance < amount) {
					success = true;
					message = `You failed to withdraw: insufficient funds`;
				} else {
					message = `ERROR: ${results.status || results.code} - Hmmmmm Withdraw Fail ${event.twitchUsername} ${amount}`;
				}
			}
		}
		return { success: success, message: message, irc_target: irc_target, configs: this.configs };
	}
};