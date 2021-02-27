/*

*/

"use strict";

const util = require('util');

const databaseAPI = require('../../../_api-service/database-api');
const { getUsers } = require('../../../_api-service/request-api');
const cleanParams = require('../utils/clean-params');
const MESSAGE_TYPE = require('../utils/message-type');

module.exports = {
	configs: {
		name: 'blacklist',
		cooldown: 20,
		global_cooldown: false,
		description: 'Add user to the blacklist for all BITCORN services',
		example: '$blacklist @username',
		enabled: true,
		irc_in: MESSAGE_TYPE.irc_chat,
		irc_out: MESSAGE_TYPE.irc_chat
	},
	async execute(event) {

		let success = false;
		let message = 'Command failed';
		let irc_target = event.irc_target;

		const twitchUsername = cleanParams.at(event.args.params[0]);

		const { data: [user] } = await getUsers([twitchUsername]);

		if (user.error) {
			message = JSON.stringify(user);
		} else {

			const result = await databaseAPI.requestBlacklist(event.twitchId, user.id);
			if (result.status && result.status === 500) {

				// NOTE needs to be logged to the locally as an error
				message = `${message}: ${result.status} ${result.statusText}`;

			} else if (result.status) {

				message = `${message}: ${result.status} ${result.statusText}`;

			} else if (result.Value) {

				success = true;
				message = util.format('User %s was added to the blacklist', result.Value.twitchUsername);

			} else {
				message = util.format(`ERROR: ${result.status || result.code} - Hmmmmm Blacklist Fail`, twitchUsername, amount);
			}
		}

		return { success: success, message: message, irc_target: irc_target, configs: this.configs };
	}
};