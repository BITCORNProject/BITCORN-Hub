
"use strict";

const tmi = require('tmi.js');
const auth = require('../../settings/auth');

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

function onConnectedChatHandler(addr, port) {
	return { addr, port };
}

async function onMessageHandler(target, user, msg, self) {
	return { success: true, msg };
}

function beforeInit() {
	/*clients.chat.on('connected', onConnectedChatHandler);
	clients.chat.on('chat', onMessageHandler);

	clients.chat.on('names', onNamesHandler);
	clients.chat.on('join', onJoinHandler);
	clients.chat.on('part', onPartHandler);

	clients.chat.on("cheer", onCheer);
	clients.chat.on("subgift", onSubGift);
	clients.chat.on("subscription", onSubscription);
	clients.chat.on("resub", onResub);

	clients.whisper.on('connected', onConnectedWhisperHandler);
	clients.whisper.on('whisper', onWhisperHandler);*/
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

module.exports = {
	connectToChat,
	connectToWhisper,
	joinChannel,
	partChannel,

	chatClient: clients.chat,

	onConnectedChatHandler,
	onMessageHandler,
};