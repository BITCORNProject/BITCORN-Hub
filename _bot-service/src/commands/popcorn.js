/*

*/

"use strict";

const databaseAPI = require('../../../_api-shared/database-api');
const cleanParams = require('../utils/clean-params');
const MESSAGE_TYPE = require('../utils/message-type');
const settingsHelper = require('../../settings-helper');

module.exports = {
	configs: {
		name: 'popcorn',
		prefix: '!',
		cooldown: 20,
		global_cooldown: false,
		description: 'Popcorn to join the battlegrounds round',
		example: '!popcorn',
		enabled: true,
		irc_in: MESSAGE_TYPE.irc_chat,
		irc_out: MESSAGE_TYPE.irc_none
	},
	async execute(event) {

		let success = false;
		let message = 'Command failed';
		let irc_target = event.irc_target;

		const body = {
			userPlatformId: `twitch|${event.twitchId}`,
			ircTarget: event.channelId
		};

		const result = await databaseAPI.request(event.twitchId, body).popcorn();
		if (result.status && result.status === 500) {
			success = false;
		} else {
			success = true;
			message = 'Command Completed';
		}

		return { 
			success: success, 
			message: message, 
			irc_target: irc_target, 
			configs: this.configs 
		};
	}
};