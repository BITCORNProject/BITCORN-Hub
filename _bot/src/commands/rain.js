/*

*/

"use strict";

const fetch = require('node-fetch');
const util = require('util');

const auth = require('../../../settings/auth');
const serverSettings = require('../../../settings/server-settings');

const databaseAPI = require('../api-interface/database-api');
const cleanParams = require('../utils/clean-params');
const MESSAGE_TYPE = require('../utils/message-type');
const math = require('../utils/math');
const activityTracker = require('../../src/activity-tracker');

module.exports = {
	configs: {
		name: 'rain',
		cooldown: 20,
		global_cooldown: false,
		description: 'Rain a certain Amount to the last 1-10 of People who were active',
		example: '$rain <amount> <1-10>',
		enabled: true,
		irc_in: MESSAGE_TYPE.irc_chat,
		irc_out: MESSAGE_TYPE.irc_chat
	},
	async execute(event) {
		let success = false;
		let message = 'Command failed';
		let irc_target = event.irc_target;

		const rain_amount = cleanParams.amount(event.args.params[0]);
		const rain_user_count = cleanParams.amount(event.args.params[1]);

		if (cleanParams.isNumber(rain_amount) === false ||
			cleanParams.isNumber(rain_user_count) === false ||
			rain_amount < serverSettings.getValues().MIN_RAIN_AMOUNT ||
			rain_amount >= databaseAPI.MAX_WALLET_AMOUNT ||
			rain_user_count <= 0 || rain_user_count > databaseAPI.MAX_RAIN_USERS) {

			message = 'Invalid input';
		} else {
			const chatternamesArr = activityTracker.getChatterActivity(event.channel)
				.filter(x => x.username !== event.twitchUsername && x.id);

			const items = chatternamesArr.slice(0, rain_user_count);
			const amount = math.fixed8(rain_amount / items.length);
			const recipients = items.map(x => `twitch|${x.id}`);

			const body = {
				from: `twitch|${event.twitchId}`,
				to: recipients,
				platform: 'twitch',
				amount: amount,
				columns: ['balance', 'twitchusername', 'isbanned', 'twitchid']
			};

			const results = await databaseAPI.request(event.twitchId, body).rain();

			if (results.status && results.status === 500) {

				// NOTE needs to be logged to the locally as an error
				message = `${message}: ${results.status} ${results.statusText}`;

			} else if (results.status && results.status === 420) {

				message = `API access locked for ${event.twitchId}`;

			} else if (results.status) {

				message = `${message}: ${results.status} ${results.statusText}`;

			} else if (results.length > 0 && results[0].from.isbanned === false) {

				success = true;

				const successItems = results.filter(x => {
					return x.to && x.txId && x.to.isbanned === false;
				}).map(x => x.to.twitchusername);

				const failedItems = results.filter(x => {
					return x.to && !x.txId && x.to.isbanned === false;
				}).map(x => x.to.twitchusername);

				if(failedItems.length === 0) {
					for (let i = 0; i < items.length; i++) {
						const item = items[i];
						if(successItems.includes(item.username)) continue;
						if(results.find(x => x.to && x.to.twitchusername === item.username)) continue;
						failedItems.push(item.username);
					}
				}

				if (successItems.length > 0 && failedItems.length > 0) {
					const successMessage = `FeelsRainMan ${successItems.join(', ')}, you all just received a glorious CORN shower of ${amount} BITCORN rained on you by ${event.twitchUsername}! FeelsRainMan`;
					const failedMessage = ` // ${failedItems.join(', ')} head on over to https://bitcornfarms.com/ to register a BITCORN ADDRESS to your TWITCHID and join in on the fun!`;
					message = `${successMessage}${(failedItems.length > 0 ? failedMessage : '')}`;
				} else if (successItems.length == 0 && failedItems.length > 0) {
					const successMessage = `${event.twitchUsername} FeelsRainMan`;
					const failedMessage = ` // ${failedItems.join(', ')} head on over to https://bitcornfarms.com/ to register a BITCORN ADDRESS to your TWITCHID and join in on the fun!`;
					message = `${successMessage}${failedMessage}`;
				} else if (successItems.length > 0 && failedItems.length == 0) {
					const successMessage = `FeelsRainMan ${successItems.join(', ')}, you all just received a glorious CORN shower of ${amount} BITCORN rained on you by ${event.twitchUsername}! FeelsRainMan`;
					message = successMessage;
				} else if (successItems.length == 0 && failedItems.length == 0) {
					message = `${event.twitchUsername} rained on noone`;
				}

			} else {
				message = util.format('Hmmmmm Rain Fail', event.twitchUsername, amount);
			}
		}

		return Promise.resolve({ success: success, message: message, irc_target: irc_target, configs: this.configs });
	}
};