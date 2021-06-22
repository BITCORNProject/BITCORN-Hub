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
			message = `@${event.twitchUsername} head on over to https://bitcornfarms.com/ to register a BITCORN ADDRESS to your TWITCHID to use the ${this.configs.name} command and join in on the fun!`;
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