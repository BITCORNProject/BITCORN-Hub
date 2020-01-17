/*

*/

"use strict";

const fetch = require('node-fetch');
const util = require('util');

const auth = require('../../settings/auth');

const databaseAPI = require('../../source/config/api-interface/database-api');
const cleanParams = require('../utils/clean-params');

const MESSAGE_TYPE = require('../utils/message-type');

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
		
		const {id: toUserId} = await fetch(`http://localhost:${auth.getValues().PORT}/user?username=${twitchUsername}`).then(res => res.json());

		if(toUserId) {
			const body = {
				from: `twitch|${event.twitchId}`,
				to: `twitch|${toUserId}`,
				platform: 'twitch',
				amount: amount,
				columns: ['balance', 'twitchusername']
			};

			const result = await databaseAPI.request(event.twitchId, body).tipcorn();

			if(result.status && result.status === 500) {
				// NOTE needs to be logged to the locally as an error
				message = `${message}: ${result.status} ${result.statusText}`;
			} else if(result.status && result.status === 420) {
				message = `API access locked for ${twitchId}`;
			} else if (result.status) {
				message = `${message}: ${result.status} ${result.statusText}`;
			} else {
				success = true;
				message = util.format('cttvCorn Just slipped @%s %d BITCORN with a FIRM handshake. cttvCorn', twitchUsername, amount);
			}
		} else {
			message = `Twitch user ${twitchUsername} not found`;
		}

		return { success: success, message: message, irc_target: irc_target, configs: this.configs };
	}
};