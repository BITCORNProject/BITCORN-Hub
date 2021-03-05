/*

*/

"use strict";

const databaseAPI = require('../../../_api-service/database-api');
const MESSAGE_TYPE = require('../utils/message-type');
const settingsHelper = require('../../settings-helper');

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

		if (settingsHelper.transactionsDisabled(event.channel)) return settingsHelper.txDisabledOutput({ irc_target, configs: this.configs });

		const result = await databaseAPI.request(event.twitchId, null).bitcorn();
		if (result.status && result.status === 500) {

			// NOTE needs to be logged to the locally as an error
			message = `${message}: ${result.status} ${result.statusText}`;

		} else if (result.status && result.status === 204) {

			success = true;
			message = `Hey!  @${event.twitchUsername} you are not registered please visit the sync site https://bitcornfarms.com/`;

		} else if (result.status && result.status === 420) {

			message = `API access locked for ${event.twitchId}`;

		} else if (result.status || result.code) {

			message = `ERROR: ${result.status || result.code} - Hmmmmm Bitcorn Fail @${event.twitchUsername}`;

		} else {
			success = true;
			message = `Howdy BITCORN Farmer! You have amassed ${result.balance} $BITCORN in your corn silo!  Your silo is currently located at this BITCORN Address: ${result.cornAddy}`;
		}

		return { 
			success: success, 
			message: message, 
			irc_target: irc_target, 
			configs: this.configs 
		};
	}
};