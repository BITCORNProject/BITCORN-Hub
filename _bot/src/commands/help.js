/*

*/

"use strict";

const MESSAGE_TYPE = require('../utils/message-type');

module.exports = {
	configs: {
		name: 'help',
		cooldown: 20,
		global_cooldown: false,
		description: 'Prints bitcorn commands to the chat.',
		example: '$help',
		enabled: true,
		irc_in: MESSAGE_TYPE.irc_chat,
		irc_out: MESSAGE_TYPE.irc_chat
	},
	async execute(event) {
		return { 
			success: true, 
			message: `mttvCorn To see all available BITCORN commands, please visit https://bitcornproject.com/help/ mttvCorn`, 
			irc_target: event.irc_target, 
			configs: this.configs };
	}
};