/*

*/

"use strict";

const databaseAPI = require('../../source/config/api-interface/database-api');
const util = require('util');
const MESSAGE_TYPE = require('../utils/message-type');

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

		const amount = event.args.params[0];
		const cornaddy = event.args.params[1];

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
			message = `API access locked for ${twitchId}`;
		} else if (result.status) {
			message = `${message}: ${result.status} ${result.statusText}`;
		} else {
			success = true;
			message = util.format(`You have successfully withdrawn BITCORN off of your Twitch Wallet Address: https://explorer.bitcornproject.com/tx/%s`, result.txid);

		}

		return { success: success, message: message, irc_target: irc_target, configs: this.configs };
	}
};