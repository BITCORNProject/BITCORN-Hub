/*

*/

"use strict";

const databaseAPI = require('../../source/config/api-interface/database-api');
const util = require('util');

module.exports = {
	configs: {
		name: 'tipcorn',
		cooldown: 1000 * 30,
		global_cooldown: false,
		description: 'Tips a user with bitcorn',
		example: '$tipcorn <username> <amount>',
		enabled: true
	},
	async execute(event) {

		let success = false;
		let message = 'Command failed';

		const twitchUsername = event.args.params[0];
		const amount = event.args.params[1];

		const result = await databaseAPI.request(twitchId, body).tipcorn();

		if(result.status && result.status === 500) {
			// NOTE needs to be logged to the locally as an error
			message = `${message}: ${result.status} ${result.statusText}`;
		} else if(result.status && result.status === 420) {
			message = `API access locked for ${twitchId}`;
		} else {
			success = true;
			message = util.format('cttvCorn Just slipped @%s %d BITCORN with a FIRM handshake. cttvCorn', twitchUsername, amount);
		}

		return { success: success, message: message, configs: this.configs };
	}
};