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
			rain_amount > databaseAPI.MAX_WALLET_AMOUNT ||
			rain_user_count <= 0 || rain_user_count > databaseAPI.MAX_RAIN_USERS) {

			message = 'Invalid input';
		} else {

			const chatternamesArr = activityTracker.getChatterActivity(event.channel).filter(x => x.username !== event.twitchUsername);

			const items = chatternamesArr.slice(0, rain_user_count);
			const amount = math.fixed8(rain_amount / items.length);
			const recipients = items.map(x => `twitch|${x.id}`);

			const body = {
				from: `twitch|${event.twitchId}`,
				to: recipients,
				platform: 'twitch',
				amount: amount,
				columns: ['balance', 'twitchusername']
			};

			const results = await databaseAPI.request(event.twitchId, body).rain();

			if(results.status && results.status === 500) {
				// NOTE needs to be logged to the locally as an error
				message = `${message}: ${results.status} ${results.statusText}`;
			} else if(results.status && results.status === 420) {
				message = `API access locked for ${event.twitchId}`;
			} else if (results.status) {
				message = `${message}: ${results.status} ${results.statusText}`;
			} else if(results.length > 0) {
				
				const success_names = results.filter(x => x.to).map(x => x.to.twitchusername);
				
				const failedItems = items.filter(x => !success_names.includes(x.username)).map(x => x.username);
				const successItems = items.filter(x => success_names.includes(x.username)).map(x => x.username);

				const successMessage = `FeelsRainMan ${successItems.join(', ')}, you all just received a glorious CORN shower of ${amount} BITCORN rained on you by ${event.twitchUsername}! FeelsRainMan`;
				const failedMessage = ` // ${failedItems.join(', ')} head on over to https://bitcornfarms.com/ to register a BITCORN ADDRESS to your TWITCHID and join in on the fun!`;
				const allMsg = `${successMessage}${(failedItems.length > 0 ? failedMessage : '')}`;

				success = true;
				message = allMsg;
			} else {
				message = util.format('Hmmmmm Rain Fail', twitchUsername, amount);
			}
		}

		return Promise.resolve({ success: success, message: message, irc_target: irc_target, configs: this.configs });
	}
};