
"use strict";

const util = require('util');
const MESSAGE_TYPE = require('../utils/message-type');
const messageStrings = require('../utils/message-strings');

function exampleOutput(configs, irc_target) {
	configs.irc_out = MESSAGE_TYPE.irc_chat;
	return {
		success: true,
		message: `Here is an example ${configs.example}`,
		irc_target: irc_target,
		configs: configs
	};
}

function handelTipResponse(results, fromUsername, toUsername, amount) {
	let success = false;
	let message = 'Command failed';
	let force_chat = false;

	if (results.status && results.status === 500) {
		// NOTE needs to be logged to the locally as an error
		message = `${message}: ${results.status} ${results.statusText}`;
	} else if (results.status && results.status === 420) {
		message = `API access locked for ${fromUsername}`;
	} else if (results.status) {
		message = `${message}: ${results.status} ${results.statusText}`;
	} else if (!results[0].from) {
		message = `cttvMOONMAN Here's a tip for you: You need to register and deposit / earn BITCORN in order to use tip! cttvMOONMAN`;
		success = true;
	} else if (results.length > 0 && results[0].from.isbanned === false && !results[0].from.islocked) {
		const resultUser = results[0].to;
		if (resultUser) {
			if (resultUser.isbanned === false) {
				if (results[0].txId) {
					success = true;
					message = util.format('mttvCorn @%s Just slipped @%s %d BITCORN with a FIRM handshake. mttvCorn', fromUsername, toUsername, amount);
				} else {
					success = true;
					message = util.format(`%s You do not have enough in your balance to tip %d CORN`, fromUsername, amount);
				}
			} else {
				message = `User BANNED: ${toUsername}`;
			}
		} else {
			if (results[0].from.islocked) {
				message = `@${event.twitchUsername} your wallet is locked and cannot perform this tx`;
			} else {
				force_chat = true;
				success = true;
				message = messageStrings.register([toUsername]);
			}
		}
	} else {
		message = util.format('Hmmmmm Bitcorn', fromUsername, amount);
	}
	return { message, success, force_chat };
}

module.exports = {
	exampleOutput,
	handelTipResponse
};