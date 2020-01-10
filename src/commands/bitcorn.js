/*

*/

"use strict";

const databaseAPI = require('../../source/config/api-interface/database-api');
const util = require('util');

module.exports = {
	configs: {
		name: 'bitcorn',
		cooldown: 1000 * 30,
		global_cooldown: false,
		description: 'View your BITCORN balance and get a BITCORN wallet address if you are not registered',
		example: '$bitcorn',
		enabled: true
	},
	async execute(event) {

		let success = false;
		let message = 'Command failed';

		const result = await databaseAPI.request(event.twitchId, null).bitcorn();

		if (result.status) {
			message = `${message}: ${result.status} ${result.statusText}`;
		} else {
			success = true;
			message = util.format(`Howdy BITCORN Farmer!  You have amassed %s $BITCORN in your corn silo!  Your silo is currently located at this BITCORN Address: %s`, result.balance, result.twitchUsername)
		}
		
		return { success: success, message: message };
	}
};