"use strict";

const tmi = require('tmi.js');
const messenger = require('./messenger');
const auth = require('../../settings/auth');

const MESSAGE_TYPE = require('./utils/message-type');

const moduleloader = require('./utils/moduleloader');
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

function addMessageHandler(handler) {
	clients.chat.on('message', handler);
}

function addWhisperHandler(handler) {
	clients.whisper.on('whisper', handler);
}

function registerEvents() {
	addMessageHandler(onMessageHandler);
	addWhisperHandler(onWhisperHandler);
}

function onConnectedChatHandler(addr, port) {
	return { addr, port };
}

const allowedUsers = require('./utils/allowed-users');

async function asyncOnMessageReceived(type, target, user, msg) {

	if (allowedUsers.isCommandTesters(user.username) === false) return { success: false, msg, message: 'User not allowed', irc_target: target, configs: expectedOutProperties.configs };

	const args = messageAsCommand(msg);
	if (args.prefix !== '$') return { success: false, msg, message: 'Just a message', irc_target: target, configs: expectedOutProperties.configs };

	const command = commandsMap.get(args.name);
	if (!command) return { success: false, msg, message: 'Command not found', irc_target: target, configs: expectedOutProperties.configs };

	if (command.configs.irc_in !== type) {
		return { success: false, msg, message: `Wrong irc_in=${command.configs.irc_in} command=${command.configs.name} type=${type}`, irc_target: target, configs: expectedOutProperties.configs };
	}

	const selectCooldowns = command.configs.global_cooldown === true ? global_cooldowns : cooldowns;
	const selectedCooldownId = command.configs.global_cooldown === true ? target : user['user-id'];
	if (checkCooldown(command.configs, selectedCooldownId, selectCooldowns) === false) {
		return { success: false, msg, message: `Cooldown pending global=${command.configs.global_cooldown}`, irc_target: target, configs: expectedOutProperties.configs };
	}

	const event = {
		twitchId: user['user-id'],
		twitchUsername: user.username,
		args: args,
		irc_target: command.configs.irc_out == MESSAGE_TYPE.irc_chat ? target : user.username,
		channel: target
	};

	if (validatedEventParameters(event) === false) {
		return { success: false, msg, message: 'Event paramaters missing', irc_target: target, configs: expectedOutProperties.configs };
	}

	const result = await command.execute(event);

	//console.log(result);
	const data = result;
	data.msg = msg;

	if(data.success === true) {
		messenger.enqueueMessageByType(data.configs.irc_out, data.irc_target, data.message);
		data.result = await messenger.sendQueuedMessagesByType(data.configs.irc_out);
	}

	return data;
}

async function onWhisperHandler(target, user, msg, self) {
	if (user.username.toLowerCase() === auth.getValues().BOT_USERNAME.toLowerCase()) return { success: false, msg, message: `Whisper self`, configs: expectedOutProperties.configs };

	return asyncOnMessageReceived(MESSAGE_TYPE.irc_whisper, target, user, msg);
}

async function onMessageHandler(target, user, msg, self) {
	if (self) return { success: false, msg, message: 'Message from self', configs: expectedOutProperties.configs };

	return asyncOnMessageReceived(MESSAGE_TYPE.irc_chat, target, user, msg);
}

const _ = require('lodash');
function validatedEventParameters(event) {
	return _.reject(Object.keys(expectedEventFields), (key) => _.has(event, key)).length === 0;

	//return _.size(_.intersection(_.keys(event), expectedEventFields)) > 0

	//return Object.keys(expectedEventFields).filter(x => !event.hasOwnProperty(x)).length === 0;
}

async function validateAndExecute(event, command) {

	if (validatedEventParameters(event) === false) {
		return { success: false, msg: event.args.msg, message: 'Event paramaters missing', irc_target: event.irc_target, configs: expectedOutProperties.configs };
	}

	return command.execute(event);
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

	return { prefix: msg[0], msg, name: name.substr(1, name.length - 1), params };
}

function checkCooldown(configs, twitchId, cooldowns) {
	let success = false;

	if (configs.global_cooldown === false) {
		if (twitchId in cooldowns) {
			if(!cooldowns[twitchId][configs.name]) {
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

module.exports = {

	expectedCommandsConfigs,
	expectedEventFields,
	expectedOutProperties,

	validatedEventParameters,
	validateAndExecute,

	registerEvents,

	connectToChat,
	connectToWhisper,
	joinChannel,
	partChannel,

	chatClient: clients.chat,
	whisperClient: clients.whisper,

	addMessageHandler,
	
	onConnectedChatHandler,
	onMessageHandler,

	asyncOnMessageReceived,

	commands,
	createCommandsMap,

	messageAsCommand,

	checkCooldown,

	chatQueue: messenger.chatQueue,
	whisperQueue: messenger.whisperQueue,

	enqueueMessageByType: messenger.enqueueMessageByType,
	sendQueuedMessagesByType: messenger.sendQueuedMessagesByType
};