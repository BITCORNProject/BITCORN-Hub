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

		const user = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());

		if (!user.success || user.error) {
			message = JSON.stringify(user);
			if (user.success === false) {
				message = user.message;
			}
		} else {

			const result = await databaseAPI.requestBlacklist(event.twitchId, user.id);
			if (result.status && result.status === 500) {

				// NOTE needs to be logged to the locally as an error
				message = `${message}: ${result.status} ${result.statusText}`;

			} else if (result.status) {

				message = `${message}: ${result.status} ${result.statusText}`;

			} else if (result.Value) {

				success = true;
				message = util.format('User %s was added to the blacklist', result.Value.twitchusername);

			} else {
				message = util.format(`ERROR: ${result.status || result.code} - Hmmmmm Blacklist Fail`, twitchUsername, amount);
			}
		}

		return { success: success, message: message, irc_target: irc_target, configs: this.configs };
	}
};