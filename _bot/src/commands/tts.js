/*

*/

"use strict";

const databaseAPI = require('../../../_api-service/database-api');
const cleanParams = require('../utils/clean-params');
const MESSAGE_TYPE = require('../utils/message-type');
const settingsHelper = require('../../settings-helper');

module.exports = {
	configs: {
		name: 'tts',
		cooldown: 20,
		global_cooldown: false,
		description: 'Use text to speech',
		example: '$tts <message>',
		enabled: true,
		irc_in: MESSAGE_TYPE.irc_chat,
		irc_out: MESSAGE_TYPE.irc_chat
	},
	async execute(event) {

		let success = false;
		let message = 'Command failed';
		let irc_target = event.irc_target;

		if (settingsHelper.transactionsDisabled(event.channel)) return settingsHelper.txDisabledOutput({ irc_target, configs: this.configs });

		const body = {
			ircTarget: event.channelId,
			from: `twitch|${event.twitchId}`,
			ircMessage: cleanParams.brackets(event.args.params[0]),
			type: 'tts',
			platform: 'twitch',
			columns: ['balance', 'twitchusername', 'isbanned', 'twitchid']
		};

		const result = await databaseAPI.request(event.twitchId, body).tts();
		console.log({ result });
		//({ message, success } = commandHelper.handelTTSResponse(result, event.twitchUsername, twitchUsername, amount));

		return { success: success, message: message, irc_target: irc_target, configs: this.configs };
	}
};
