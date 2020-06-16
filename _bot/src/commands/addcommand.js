/*

*/

"use strict";

const MESSAGE_TYPE = require('../utils/message-type');

module.exports = {
	configs: {
		name: 'addcommand',
		cooldown: 20,
		global_cooldown: false,
		description: 'Adds a command to the bot',
		example: '$addcommand',
		enabled: true,
		irc_in: MESSAGE_TYPE.irc_chat,
		irc_out: MESSAGE_TYPE.irc_chat
	},
	async execute(event) {
		return { 
			success: false, 
			message: `Not implemented: ${this.configs.name} is not implemented`, 
			irc_target: event.irc_target, 
			configs: this.configs 
		};
	}
};