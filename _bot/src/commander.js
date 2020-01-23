"use strict";

const moduleloader = require('./utils/moduleloader');

const commandsPath = '../commands';
const commands = moduleloader(commandsPath);

const expectedCommandsConfigs = {
	name: '',
	cooldown: 0,
	global_cooldown: false,
	description: '',
	example: '',
	enabled: false,
	irc_in: '',
	irc_out: ''
};

const expectedEventFields = {
	twitchId: '',
	twitchUsername: '',
	args: {},
	irc_target: '', // who username/channel the chat/whisper should be sent to
	channel: ''
};

const expectedOutProperties = {
	success: false,
	msg: '',
	message: '',
	irc_target: '', // who username/channel the chat/whisper should be sent to
	configs: {}
};

function createCommandsMap() {
	const commandsMap = new Map();
	for (let i = 0; i < commands.length; i++) {
		const command = commands[i];
		if (commandsMap.has(command.configs.name)) continue;
		commandsMap.set(command.configs.name, command);
	}
	return commandsMap;
}

function messageAsCommand(msg) {

	const splits = msg.split(' ');
	const name = splits.shift();
	const params = splits;

	return { prefix: msg[0], msg, name: name.substr(1, name.length - 1), params };
}

function checkCooldown(configs, twitchId, cooldowns) {
	let success = false;

	if (configs.global_cooldown === false) {
		if (twitchId in cooldowns) {
			if (!cooldowns[twitchId][configs.name]) {
				cooldowns[twitchId][configs.name] = 0;
			}

			success = calculateCooldownSuccess(cooldowns[twitchId][configs.name]);
		} else {
			cooldowns[twitchId] = {};
			success = true;
		}

		cooldowns[twitchId][configs.name] = (new Date()).getTime() + (+configs.cooldown);

	} else {
		if (configs.name in cooldowns) {

			success = calculateCooldownSuccess(cooldowns[configs.name]);
		} else {
			success = true;
		}
		cooldowns[configs.name] = (new Date()).getTime() + (+configs.cooldown);
	}
	return success;
}

function calculateCooldownSuccess(cooldownTime) {
	return (new Date()).getTime() > +cooldownTime;
}

const _ = require('lodash');
function validatedEventParameters(event) {
	return _.reject(Object.keys(expectedEventFields), (key) => _.has(event, key)).length === 0;

	//return _.size(_.intersection(_.keys(event), expectedEventFields)) > 0

	//return Object.keys(expectedEventFields).filter(x => !event.hasOwnProperty(x)).length === 0;
}

async function validateAndExecute(event, command) {

	if (validatedEventParameters(event) === false) {
		return { success: false, msg: event.args.msg, message: 'Event paramaters missing', irc_target: event.irc_target, configs: commandsHelper.expectedCommandsConfigs };
	}

	return command.execute(event);
}

module.exports = {
	expectedCommandsConfigs,
	expectedOutProperties,

	commands,

	createCommandsMap,
	messageAsCommand,

	checkCooldown,

	validatedEventParameters,
	validateAndExecute
};