"use strict";

const tmi = require('tmi.js');
const messenger = require('./messenger');
const commander = require('./commander');
const auth = require('../../settings/auth');
const allowedUsers = require('./utils/allowed-users');
const MESSAGE_TYPE = require('./utils/message-type');

const commandsMap = commander.createCommandsMap();

const outListenerCallbacks = [];

const cooldowns = {};
const global_cooldowns = {};

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

function addOutputListener(func) {
	outListenerCallbacks.push(func);
}

async function asyncOnMessageReceived(type, target, user, msg) {

	const args = commander.messageAsCommand(msg);
	if (args.prefix !== '$') return { success: false, msg, message: 'Just a message', irc_target: target, configs: commander.expectedCommandsConfigs };

	const command = commandsMap.get(args.name);
	if (!command) return { success: false, msg, message: 'Command not found', irc_target: target, configs: commander.expectedCommandsConfigs };

	if (allowedUsers.isCommandTesters(user.username) === false) return { success: false, msg, message: 'User not allowed', irc_target: target, configs: commander.expectedCommandsConfigs };

	if (command.configs.irc_in !== type) {
		return { success: false, msg, message: `Wrong irc_in=${command.configs.irc_in} command=${command.configs.name} type=${type}`, irc_target: target, configs: commander.expectedCommandsConfigs };
	}

	const selectCooldowns = command.configs.global_cooldown === true ? global_cooldowns : cooldowns;
	const selectedCooldownId = command.configs.global_cooldown === true ? target : user['user-id'];
	if (commander.checkCooldown(command.configs, selectedCooldownId, selectCooldowns) === false) {
		return { success: false, msg, message: `Cooldown pending global=${command.configs.global_cooldown}`, irc_target: target, configs: commander.expectedCommandsConfigs };
	}

	const event = {
		twitchId: user['user-id'],
		twitchUsername: user.username,
		args: args,
		irc_target: command.configs.irc_out == MESSAGE_TYPE.irc_chat ? target : user.username,
		channel: target
	};

	if (commander.validatedEventParameters(event) === false) {
		return { success: false, msg, message: 'Event paramaters missing', irc_target: target, configs: commander.expectedCommandsConfigs };
	}

	const result = await command.execute(event);

	//console.log(result);
	const data = result;
	data.msg = msg;

	if (data.success === true) {
		messenger.enqueueMessageByType(data.configs.irc_out, data.irc_target, data.message);
		data.result = await messenger.sendQueuedMessagesByType(data.configs.irc_out);
	}

	return data;
}

async function onMessageHandler(target, user, msg, self) {
	if (self) return { success: false, msg, message: 'Message from self', configs: commander.expectedCommandsConfigs };

	const data = await asyncOnMessageReceived(user['message-type'] || MESSAGE_TYPE.irc_chat, target, user, msg);
	/*if (data.success === true) {
		console.log(data);
	} else {
		console.log(`FAILED:`, data);
	}*/
	for (let i = 0; i < outListenerCallbacks.length; i++) {
		outListenerCallbacks[i](data);
	}
	return data;
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


function addMessageHandler(handler) {
	clients.chat.on('message', handler);
}

function registerEvents() {
	addMessageHandler(onMessageHandler);
}

function onConnectedChatHandler(addr, port) {
	return { addr, port };
}

module.exports = {

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

	addOutputListener
	
};