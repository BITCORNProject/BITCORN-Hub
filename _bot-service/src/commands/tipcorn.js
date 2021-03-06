/*

*/

"use strict";

const databaseAPI = require('../../../_api-shared/database-api');
const { getUsers } = require('../request-api');
const cleanParams = require('../utils/clean-params');
const MESSAGE_TYPE = require('../utils/message-type');
const allowedUsers = require('../../../_api-shared/allowed-users');
const settingsHelper = require('../../settings-helper');
const commandHelper = require('../utils/command-helper');

module.exports = {
	configs: {
		name: 'tipcorn',
		prefix: '$',
		cooldown: null,
		global_cooldown: false,
		description: 'Tips a user with bitcorn',
		example: '$tipcorn <username> <amount>',
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

		if (event.args.params.length < 2) {
			return commandHelper.exampleOutput(configs, irc_target);
		}

		if (cleanParams.isNumber(event.args.params[0])) {
			return commandHelper.exampleOutput(configs, irc_target);
		}

		let twitchUsername = '';
		let amount = 0;

		twitchUsername = cleanParams.replaceAtSymbol(cleanParams.replaceBrackets(event.args.params[0]));
		amount = parseInt(cleanParams.replaceBrackets(event.args.params[1]), 10);
		if(!cleanParams.isNumber(amount)) {
			//message = `Can not use an amount value of ${amount} from ${event.args.params[1]} which is not a number`;
			message = `Command '${this.configs.name}' execution failed @${event.twitchUsername} please try again later`;
			return {
				success: true,
				message: message,
				irc_target: irc_target,
				configs: configs,
			};
		}

		const ircMessage = event.args.params.slice(2).join(' ');

		const minTipAmount = settingsHelper.getProperty(event.channel, 'minTipAmount');

		if (allowedUsers.activityTrackerOmitUsername(twitchUsername)) {
			message = `${this.configs.name} used on omit username ${twitchUsername}`;
		} else if (cleanParams.isNumber(amount) === false ||
			amount < minTipAmount ||
			amount >= databaseAPI.MAX_WALLET_AMOUNT) {

			if (amount < minTipAmount) {
				success = true;
				message = `Can not ${this.configs.name} an amount of '${amount}' from ${event.args.params[1]} is to small for the minimum amount of ${minTipAmount} CORN - ${this.configs.example}`;
			} else if (amount >= databaseAPI.MAX_WALLET_AMOUNT) {
				success = true;
				message = `Can not ${this.configs.name} an amount of '${amount}' from ${event.args.params[1]} is to large - ${event.twitchUsername}`;
			} else {
				message = 'Invalid input';
			}
		} else {

			const { data: [user] } = await getUsers([twitchUsername]);

			if (!user) {
				success = true;
				message = `mttvMOONMAN Here's a tip for you: ${twitchUsername} who? mttvMOONMAN`;
			} else {
				const body = {
					ircTarget: event.channelId,
					ircMessage: ircMessage,
					from: `twitch|${event.twitchId}`,
					to: `twitch|${user.id}`,
					platform: 'twitch',
					amount: amount,
					columns: ['balance', 'twitchusername', 'isbanned', 'islocked']
				};

				const result = await databaseAPI.request(event.twitchId, body).tipcorn();

				({ message, success } = commandHelper.handelTipResponse(result, event.twitchUsername, twitchUsername, amount));
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

