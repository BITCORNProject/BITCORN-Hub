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

		if(event.args.params.length < 2) {
			configs.irc_out = MESSAGE_TYPE.irc_chat;
			success = true;
			return {
				success: success,
				message: `Here is an example ${configs.example}`,
				irc_target: irc_target,
				configs: configs
			};
		}

		if(cleanParams.isNumber(event.args.params[0])) {
			configs.irc_out = MESSAGE_TYPE.irc_chat;
			success = true;
			return {
				success: success,
				message: `Here is an example ${configs.example}`,
				irc_target: irc_target,
				configs: configs
			};
		}

		const twitchUsername = cleanParams.at(event.args.params[0]);
		const amount = cleanParams.amount(event.args.params[1]);
		const ircMessage = event.args.params.slice(2).join(' ');

		const minTipAmount = settingsHelper.getProperty(event.channel, 'minTipAmount');

		if (allowedUsers.activityTrackerOmitUsername(twitchUsername)) {
			message = `${this.configs.name} used on omit username ${twitchUsername}`;
		} else if (cleanParams.isNumber(amount) === false ||
			amount < minTipAmount ||
			amount >= databaseAPI.MAX_WALLET_AMOUNT) {

			if (amount < minTipAmount) {
				success = true;
				message = `Can not ${this.configs.name} an amount that small minimum amount ${minTipAmount} CORN - ${this.configs.example}`;
			} else if (amount >= databaseAPI.MAX_WALLET_AMOUNT) {
				success = true;
				message = `Can not ${this.configs.name} an amount that large - ${event.twitchUsername}`;
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
