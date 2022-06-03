/*

*/

"use strict";

const databaseAPI = require('../../../_api-shared/database-api');
const cleanParams = require('../utils/clean-params');
const MESSAGE_TYPE = require('../utils/message-type');
const settingsHelper = require('../../settings-helper');
const messageStrings = require('../utils/message-strings');

module.exports = {
	configs: {
		name: 'popcorn',
		prefix: '!',
		cooldown: null,
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
		let irc_target = event.channel.replace(/#/g, '');

		const configs = JSON.parse(JSON.stringify(this.configs));

		const body = {
			userPlatformId: `twitch|${event.twitchId}`,
			ircTarget: event.channelId,
			isSub: event.isSub
		};

		const result = await databaseAPI.request(event.twitchId, body).popcorn();
		console.log({ result });
		if (result.status && result.status === 500) {
			success = false;
		} else if(result.status && result.status === 404) {
			configs.irc_out = MESSAGE_TYPE.irc_chat;

			success = true;
			message = `To use the ${this.configs.name} command, ` + messageStrings.register([event.twitchUsername]);
		} else {
			success = true;
			message = 'Command Completed';
		}

		return {
			success: success,
			message: message,
			irc_target: irc_target,
			configs: configs
		};
	}
};