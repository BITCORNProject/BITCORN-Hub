/*

*/

"use strict";

const fetch = require('node-fetch');
const util = require('util');

const auth = require('../../../settings/auth');

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
		description: 'Rain a certain Amount to the last 1-3 of People who were active',
		example: '$rain <amount> <1-10>',
		enabled: true,
		irc_in: MESSAGE_TYPE.irc_chat,
		irc_out: MESSAGE_TYPE.irc_chat
	},
	async execute(event) {

		let success = false;
		let message = 'Command failed';
		let irc_target = event.irc_target;

		return { success: success, message: message, irc_target: irc_target, configs: this.configs };
	}
};