
"use strict";

const tmi = require('tmi.js');
const auth = require('../../settings/auth');

const moduleloader = require('../utils/moduleloader');
const commandsPath = '../commands';
const commands = moduleloader(commandsPath);

const commandsMap = createCommandsMap(commands);

const cooldowns = {};
const global_cooldowns = {};

const expectedCommandsConfigs = {
	name: '',
	cooldown: 0,
	global_cooldown: false,
	description: '',
	example: '',
	enabled: false
};

const expectedEventFields = {
	twitchId: '',
	args: []
};

const expectedOutProperties = {
	success: false,
	msg: '',
	message: '',
	configs: {}
};

const channels = ['callowcreation'];

const clients = {
	chat: new tmi.client({
		connection: {
			cluster: "aws",
			reconnect: true
		},
		identity: {
			username: auth.data.BOT_USERNAME,
			password: auth.data.OAUTH_TOKEN
		},
		channels: channels
	}),
	whisper: new tmi.client({
		connection: {
			reconnect: true,
			server: "group-ws.tmi.twitch.tv",
			port: 80
		},
		identity: {
			username: auth.data.BOT_USERNAME,
			password: auth.data.OAUTH_TOKEN
		},
		channels: channels
	})
};

function registerEvents() {
	clients.chat.on('message', onMessageHandler);
}

function onConnectedChatHandler(addr, port) {
	return { addr, port };
}

async function onMessageHandler(target, user, msg, self) {

	if (self) return { success: false, msg, message: 'Message from self', configs: expectedOutProperties.configs };

	const args = messageAsCommand(msg);
	if (args.prefix !== '$') return { success: false, msg, message: 'Just a message', configs: expectedOutProperties.configs };

	const command = commandsMap.get(args.name);
	if (!command) return { success: false, msg, message: 'Command not found', configs: expectedOutProperties.configs };

	const selectCooldowns = command.configs.global_cooldown === true ? global_cooldowns : cooldowns;
	if (checkCooldown(command.configs, user['user-id'], selectCooldowns) === false) {
		return { success: false, msg, message: 'Cooldown pending', configs: expectedOutProperties.configs };
	}

	const event = {
		twitchId: user['user-id']
	};

	if(validatedEventParameters(event) === false) {
		return { success: false, msg, message: 'Event paramaters missing', configs: expectedOutProperties.configs };
	}

	const result = await command.execute(event);

	const data = result;
	data.msg = msg;

	return data;
}

const _ = require('lodash');
function validatedEventParameters(event) {
	return _.reject(Object.keys(expectedEventFields), (key) => _.has(event, key)).length === 0;
	
	//return _.size(_.intersection(_.keys(event), expectedEventFields)) > 0

	//return Object.keys(expectedEventFields).filter(x => !event.hasOwnProperty(x)).length === 0;
}

async function connectToChat() {
	return clients.chat.connect();
}

async function connectToWhisper() {
	return clients.whisper.connect();
}

async function joinChannel(channel) {
	return clients.chat.join(channel);
}

async function partChannel(channel) {
	return clients.chat.part(channel);
}

function createCommandsMap(commands) {
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

	return { prefix: msg[0], name: name.substr(1, name.length - 1), params };
}

function checkCooldown(configs, twitchId, cooldowns) {
	let success = false;

	if (configs.global_cooldown === false) {
		if (twitchId in cooldowns) {
			success = calculateCooldownSuccess(cooldowns[twitchId][configs.name]);
		} else {
			cooldowns[twitchId] = {};
			success = true;
		}
		
		cooldowns[twitchId][configs.name] = (new Date()).getTime() + (+configs.cooldown);
		
	} else {
		if(configs.name in cooldowns) {
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

module.exports = {

	expectedCommandsConfigs, 
	expectedEventFields,
	expectedOutProperties,

	validatedEventParameters,

	registerEvents,

	connectToChat,
	connectToWhisper,
	joinChannel,
	partChannel,

	chatClient: clients.chat,

	onConnectedChatHandler,
	onMessageHandler,

	commands,
	createCommandsMap,

	messageAsCommand,

	checkCooldown
};