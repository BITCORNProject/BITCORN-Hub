"use strict";

const fs = require('fs');
const tmi = require('tmi.js');
const messenger = require('./messenger');
const commander = require('./commander');
const allowedUsers = require('./utils/allowed-users');
const MESSAGE_TYPE = require('./utils/message-type');
const REWARD_TYPE = require('./utils/reward-type');
const settingsHelper = require('../settings-helper');


const commandsMap = commander.createCommandsMap();

const outMessageCallbacks = [];
const outRerwardCallbacks = [];

const cooldowns = {};
const global_cooldowns = {};

// to stop duplicate rewards being processed
// example image location
// \misc\duplicate-reward.PNG
const rewardedIds = [];

//const channels = ['markettraderstv', 'd4rkcide'];
const channels = [];

const amounts = {
	cheer: {
		'0000': 10
	},
	subgift: {
		'Prime': 420,
		'1000': 420,
		'2000': 1000,
		'3000': 4200
	},
	subscription: {
		'Prime': 420,
		'1000': 420,
		'2000': 1000,
		'3000': 4200
	},
	resub: {
		'Prime': 420,
		'1000': 420,
		'2000': 1000,
		'3000': 4200
	}
};

const tiers = {
	'Prime': 1,
	'1000': 1,
	'2000': 2,
	'3000': 3
};

const client = new tmi.client({
	connection: {
		cluster: "aws",
		reconnect: true
	},
	identity: {
		username: process.env.BOT_USERNAME,
		password: process.env.OAUTH_TOKEN
	},
	channels: channels
});

function addMessageOutputListener(func) {
	outMessageCallbacks.push(func);
}

function addRewardOutputListener(func) {
	outRerwardCallbacks.push(func);
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

	const settingsConfigs = {
		name: command.configs.name,
		cooldown: settingsHelper.getChannelCooldown(target, command.configs.cooldown),
		global_cooldown: command.configs.global_cooldown
	};

	if (commander.checkCooldown(settingsConfigs, selectedCooldownId, selectCooldowns) === false) {
		return { success: false, msg, message: `Cooldown pending global=${command.configs.global_cooldown}`, irc_target: target, configs: commander.expectedCommandsConfigs };
	}

	const event = {
		channelId: user['room-id'],
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
	result.msg = msg;

	if (result.success === true) {
		messenger.enqueueMessageByType(result.configs.irc_out, result.irc_target, result.message);
		result.result = await messenger.sendQueuedMessagesByType(result.configs.irc_out);
	}

	//console.log({ event, result });
	return result;
}

async function onMessageHandler(target, user, msg, self) {
	if (self) return { success: false, msg, message: 'Message from self', configs: commander.expectedCommandsConfigs };

	const data = await asyncOnMessageReceived(user['message-type'] || MESSAGE_TYPE.irc_chat, target, user, msg);
	/*if (data.success === true) {
		console.log(data);
	} else {
		console.log(`FAILED:`, data);
	}*/
	for (let i = 0; i < outMessageCallbacks.length; i++) {
		outMessageCallbacks[i](data);
	}
	return data;
}

/*

Rewards

*/

async function onCheer(channel, userstate, message) {
	if (duplicateRewardCheck(userstate.id) === true) return { success: false, message: `Duplicate reward id ${userstate.id} onCheer` };
	if (noRewardCheck(channel) === true) return { success: false, message: `no reward channel ${channel} onCheer` };
	const username = userstate.username;
	const bitAmount = userstate.bits * settingsHelper.getBitcornPerBit(channel, amounts.cheer['0000']);
	return handleRewardEvent(REWARD_TYPE.cheer, channel, username, { bitAmount });
}

async function onSubGift(channel, username, streakMonths, recipient, methods, userstate) {
	if (duplicateRewardCheck(userstate.id) === true) return { success: false, message: `Duplicate reward id ${userstate.id} onSubGift` };
	if (noRewardCheck(channel) === true) return { success: false, message: `no reward channel ${channel} onSubGift` };
	const amount = amounts.subgift[methods.plan];
	return handleRewardEvent(REWARD_TYPE.subgift, channel, username, { amount });
}

async function onSubscription(channel, username, methods, message, userstate) {
	if (duplicateRewardCheck(userstate.id) === true) return { success: false, message: `Duplicate reward id ${userstate.id} onSubscription` };
	if (noRewardCheck(channel) === true) return { success: false, message: `no reward channel ${channel} onSubscription` };
	//const amount = amounts.subscription[methods.plan];
	const amount = settingsHelper.getBitcornPerDonation(channel, amounts.subscription[methods.plan]);
	const subTier = tiers[methods.plan];
	return handleRewardEvent(REWARD_TYPE.subscription, channel, username, { amount, subTier });
}

async function onResub(channel, username, months, message, userstate, methods) {
	if (duplicateRewardCheck(userstate.id) === true) return { success: false, message: `Duplicate reward id ${userstate.id} onResub` };
	if (noRewardCheck(channel) === true) return { success: false, message: `no reward channel ${channel} onResub` };
	//const amount = amounts.resub[methods.plan];
	const amount = settingsHelper.getBitcornPerDonation(channel, amounts.resub[methods.plan]);
	const subTier = tiers[methods.plan];
	return handleRewardEvent(REWARD_TYPE.resub, channel, username, { amount, subTier });
}

function duplicateRewardCheck(rewardId) {
	if (rewardedIds.includes(rewardId) === true) return true;
	rewardedIds.push(rewardId);
	return false;
}

function noRewardCheck(channel) {
	const noRewardFilename = __dirname + '/./../../settings/no-rewards.json';
	const channels = JSON.parse(fs.readFileSync(noRewardFilename, 'utf-8'));

	return channels.map(x => hashReplace(x)).includes(hashReplace(channel));
}

function hashReplace(channel) {
	return channel.replace('#', '').toLowerCase();
}

async function handleRewardEvent(type, channel, username, extras) {

	if (!settingsHelper.getIrcEventPayments(channel, false)) return { msg: 'reward events disabled' };

	messenger.enqueueReward(type, channel, username, extras);
	const result = await messenger.sendQueuedRewards();

	for (let i = 0; i < outRerwardCallbacks.length; i++) {
		outRerwardCallbacks[i](result);
	}
	return result;
}

async function connectToChat() {
	return client.connect();
}

async function joinChannel(channel) {
	return client.join(channel);
}

async function partChannel(channel) {
	return client.part(channel);
}

function addRewardHandlers() {
	client.on("cheer", onCheer);
	client.on("subgift", onSubGift);
	client.on("subscription", onSubscription);
	client.on("resub", onResub);
}

function addMessageHandler(handler) {
	client.on('message', handler);
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
	joinChannel,
	partChannel,

	chatClient: client,
	whisperClient: client,

	addMessageHandler,

	onConnectedChatHandler,
	onMessageHandler,
	addRewardHandlers,

	asyncOnMessageReceived,

	addMessageOutputListener,
	addRewardOutputListener,

	amounts,

	onCheer,
	onSubGift,
	onSubscription,
	onResub,

	duplicateRewardCheck,
	noRewardCheck

};