
"use strict";

const util = require('util');

function handelTipResponse(result, fromUsername, toUsername, amount) {
	let success = false;
	let message = 'Command failed';

	if (result.status && result.status === 500) {
		// NOTE needs to be logged to the locally as an error
		message = `${message}: ${result.status} ${result.statusText}`;

	} else if (result.status && result.status === 420) {

		message = `API access locked for ${fromUsername}`;

	} else if (result.status) {

		message = `${message}: ${result.status} ${result.statusText}`;

	} else if (!result[0].from) {
		message = `cttvMOONMAN Here's a tip for you: You need to register and deposit / earn BITCORN in order to use tip! cttvMOONMAN`;
		success = true;
	} else if (result.length > 0 && result[0].from.isbanned === false) {
		const resultUser = result[0].to;
		if (resultUser) {

			if (resultUser.isbanned === false) {
				if (result[0].txId) {
					success = true;
					message = util.format('mttvCorn @%s Just slipped @%s %d BITCORN with a FIRM handshake. mttvCorn', fromUsername, resultUser.twitchusername, amount);
				} else {
					success = true;
					message = util.format(`%s You do not have enough in your balance to tip %d CORN`, fromUsername, amount);
				}
			} else {
				message = `User BANNED: ${resultUser.twitchusername}`;
			}
		} else {
			success = true;
			message = `@${toUsername} head on over to https://bitcornfarms.com/ to register a BITCORN ADDRESS to your TWITCHID and join in on the fun!`;
		}
	} else {
		message = util.format('Hmmmmm Bitcorn', fromUsername, amount);
	}
	return { message, success };
}

module.exports = {
	handelTipResponse
};