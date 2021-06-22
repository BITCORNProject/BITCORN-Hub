/*

*/

"use strict";

const databaseAPI = require('../../../_api-shared/database-api');
const cleanParams = require('../utils/clean-params');
const MESSAGE_TYPE = require('../utils/message-type');
const math = require('../utils/math');
const settingsHelper = require('../../settings-helper');
const activityTracker = require('../../src/activity-tracker');
const commandHelper = require('../utils/command-helper');

module.exports = {
	configs: {
		name: 'rain',
		prefix: '$',
		cooldown: null,
		global_cooldown: false,
		description: 'Rain a certain Amount to the last 1-10 of People who were active',
		example: `$rain <amount> <1-${process.env.MAX_RAIN_USERS}>`,
		enabled: true,
		irc_in: MESSAGE_TYPE.irc_chat,
		irc_out: MESSAGE_TYPE.irc_chat
	},
	async execute(event) {
		let success = false;
		let message = 'Command failed';
		let irc_target = event.irc_target;

		if (!settingsHelper.getProperty(event.channel, 'enableTransactions')) return settingsHelper.txDisabledOutput({ irc_target, configs: this.configs });

		const configs = JSON.parse(JSON.stringify(this.configs));
		configs.irc_out = settingsHelper.getIrcMessageTarget(event.channel, this.configs.irc_out, MESSAGE_TYPE);

		if(event.args.params.length < 2) {
			return commandHelper.exampleOutput(configs, irc_target);
		}

		const rain_amount = cleanParams.amount(event.args.params[0]);
		const rain_user_count = cleanParams.amount(event.args.params[1]);
		const ircMessage = event.args.params.slice(2).join(' ');

		const minRainAmount = settingsHelper.getProperty(event.channel, 'minRainAmount');

		if (cleanParams.isNumber(rain_amount) === false ||
			cleanParams.isNumber(rain_user_count) === false ||
			rain_amount < minRainAmount ||
			rain_amount >= process.env.MAX_WALLET_AMOUNT ||
			rain_user_count <= 0 || rain_user_count > process.env.MAX_RAIN_USERS) {
			if (rain_amount < minRainAmount) {
				success = true;
				message = `Can not ${this.configs.name} an amount that small minimum amount ${minRainAmount} CORN - ${this.configs.example}`;
			} else if (rain_user_count > process.env.MAX_RAIN_USERS) {
				success = true;
				message = `Number of people you can ${this.configs.name} to is 1 to ${process.env.MAX_RAIN_USERS}`;
			} else if (rain_amount >= process.env.MAX_WALLET_AMOUNT) {
				success = true;
				message = `Can not ${this.configs.name} an amount that large - ${event.twitchUsername}`;
			} else {
				message = 'Invalid input';
			}
		} else {

			const chatternamesArr = await activityTracker.getChatterActivity(event.channel);

			const filtered = chatternamesArr.filter(x => x.id !== event.twitchId);
			const items = filtered.slice(0, rain_user_count);

			const amount = math.fixed8(rain_amount / items.length);
			const recipients = items.map(x => `twitch|${x.id}`);

			const body = {
				ircTarget: event.channelId,
				ircMessage: ircMessage,
				from: `twitch|${event.twitchId}`,
				to: recipients,
				platform: 'twitch',
				amount: amount,
				columns: ['balance', 'twitchusername', 'isbanned', 'twitchid', 'islocked']
			};

			const results = await databaseAPI.request(event.twitchId, body).rain();

			if (results.status && results.status === 500) {
				// NOTE needs to be logged to the locally as an error
				message = `${message}: ${results.status} ${results.statusText}`;
			} else if (results.status && results.status === 420) {
				message = `API access locked for ${event.twitchId}`;
			} else if (results.status) {
				message = `${message}: ${results.status} ${results.statusText}`;
			} else if (!results[0].from) {
				message = `DogePls SourPls You failed to summon rain, with your weak ass rain dance. You need to register and deposit / earn BITCORN in order to make it rain! DogePls SourPls`;
				success = true;
			} else if (results.length > 0 && results[0].from.isbanned === false && !results[0].from.islocked) {

				success = true;

				const successItems = results.filter(x => {
					return x.to && x.txId && x.to.isbanned === false;
				}).map(x => x.to.twitchusername.toLowerCase());
				const ignore = results.filter(x => {
					return x.to && x.to.isbanned === true;
				}).map(x => x.to.twitchusername.toLowerCase());

				const failedItems = [];
				for (let i = 0; i < items.length; i++) {
					const item = items[i];
					const name = item.username.toLowerCase();
					if (successItems.includes(name) || ignore.includes(name)) continue;
					//if (results.find(x => x.to && x.to.twitchusername === name)) continue;

					failedItems.push(item.username);
				}

				if (successItems.length > 0 && failedItems.length > 0) {
					const successMessage = `FeelsRainMan ${successItems.join(', ')}, you all just received a glorious CORN shower of ${amount} BITCORN rained on you by ${event.twitchUsername}! FeelsRainMan`;
					const failedMessage = ` // ${failedItems.join(', ')} head on over to https://bitcornfarms.com/ to register a BITCORN ADDRESS to your TWITCHID and join in on the fun!`;
					message = `${successMessage}${(failedItems.length > 0 ? failedMessage : '')}`;
				} else if (successItems.length == 0 && failedItems.length > 0) {
					if (results[0].from.balance < rain_amount) {
						message = `DogePls SourPls ${event.twitchUsername} You failed to summon rain, with your weak ass rain dance. Check your silo, it is low on CORN! DogePls SourPls`;
					} else {
						const successMessage = `${event.twitchUsername} FeelsRainMan`;
						const failedMessage = ` // ${failedItems.join(', ')} head on over to https://bitcornfarms.com/ to register a BITCORN ADDRESS to your TWITCHID and join in on the fun!`;
						message = `${successMessage}${failedMessage}`;
					}
				} else if (successItems.length > 0 && failedItems.length == 0) {
					const successMessage = `FeelsRainMan ${successItems.join(', ')}, you all just received a glorious CORN shower of ${amount} BITCORN rained on you by ${event.twitchUsername}! FeelsRainMan`;
					message = successMessage;
				} else if (successItems.length == 0 && failedItems.length == 0) {
					success = false;
					message = `${event.twitchUsername} rained on noone`;
				}
			} else {
				if (results.length > 0 && results[0].from.islocked === true) {
					message = `@${event.twitchUsername} your wallet is locked and cannot perform this tx`;
				} else if (results.length > 0 && results[0].from.isbanned === true) {
					message = `User BANNED: ${event.twitchusername}`;
				} else {
					message = `ERROR: ${results.status || results.code} - Hmmmmm Rain Fail ${event.twitchUsername} ${amount}`;
				}
			}
		}

		return {
			success: success,
			message: message,
			irc_target: irc_target,
			configs: configs
		};
	}
};