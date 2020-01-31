/*

*/

"use strict";

const fetch = require('node-fetch');
const util = require('util');

const auth = require('../../settings/auth');
const serverSettings = require('../../settings/server-settings');

const databaseAPI = require('../api-interface/database-api');
const cleanParams = require('../utils/clean-params');
const MESSAGE_TYPE = require('../utils/message-type');

const commandHelper = require('../shared-lib/command-helper');

module.exports = {
	configs: {
		name: 'tipcorn',
		cooldown: 20,
		global_cooldown: false,
		description: 'Tips a user with bitcorn',
		example: '$tipcorn <username> <amount>',
		enabled: true,
		irc_in: MESSAGE_TYPE.irc_chat,
		irc_out: MESSAGE_TYPE.irc_chat
	},
	async execute(event) {

		let success = false;
		let message = 'Command failed';
		let irc_target = event.irc_target;

		const twitchUsername = cleanParams.at(event.args.params[0]);
		const amount = cleanParams.amount(event.args.params[1]);

		if (cleanParams.isNumber(amount) === false ||
			amount < serverSettings.MIN_TIPCORN_AMOUNT ||
			amount >= databaseAPI.MAX_WALLET_AMOUNT) {

			message = 'Invalid input';
		} else {

			const user = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());

			if (!user.success || user.error) {
				message = JSON.stringify(user);
				if (user.success === false) {
					message = user.message;
				}
			} else {
				const body = {
					from: `twitch|${event.twitchId}`,
					to: `twitch|${user.id}`,
					platform: 'twitch',
					amount: amount,
					columns: ['balance', 'twitchusername', 'isbanned']
				};

				const result = await databaseAPI.request(event.twitchId, body).tipcorn();
				
				({ message, success } = commandHelper.handelTipResponse(result, event.twitchUsername, twitchUsername, amount));
			}
		}
		return { success: success, message: message, irc_target: irc_target, configs: this.configs };
	}
};
