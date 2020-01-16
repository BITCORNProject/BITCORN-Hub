/*

*/

"use strict";

const databaseAPI = require('../../source/config/api-interface/database-api');
const util = require('util');
const MESSAGE_TYPE = require('../utils/message-type');

module.exports = {
	configs: {
		name: 'bitcorn',
		cooldown: 20,
		global_cooldown: false,
		description: 'View your BITCORN balance and get a BITCORN wallet address if you are not registered',
		example: '$bitcorn',
		enabled: true,
		irc_in: MESSAGE_TYPE.irc_chat,
		irc_out: MESSAGE_TYPE.irc_whisper
	},
	async execute(event) {

		let success = false;
		let message = 'Command failed';
		let irc_target = event.irc_target;

		const result = await databaseAPI.request(event.twitchId, null).bitcorn();

		if (result.status) {
			// NOTE needs to be logged to the locally as an error
			message = `${message}: ${result.status} ${result.statusText}`;
		} else {
			success = true;
			message = util.format(`Howdy BITCORN Farmer!  You have amassed %s $BITCORN in your corn silo!  Your silo is currently located at this BITCORN Address: %s`, result.balance, result.twitchUsername);
		}
		
		return { success: success, message: message, irc_target: irc_target, configs: this.configs };
	}
};