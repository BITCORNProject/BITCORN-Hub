"use strict";

const tmi = require('tmi.js');
const messenger = require('./messenger');
const commander = require('./commander');
const allowedUsers = require('../../_api-shared/allowed-users');
const MESSAGE_TYPE = require('./utils/message-type');
const REWARD_TYPE = require('./utils/reward-type');
const settingsHelper = require('../settings-helper');

const NoDups = require('./utils/no-dups');

const commandsMap = commander.createCommandsMap();

const outMessageCallbacks = [];
const outRerwardCallbacks = [];

const cooldowns = {};
const global_cooldowns = {};

// to stop duplicate rewards being processed
// example image location
// \misc\duplicate-reward.PNG
const rewardedIds = new NoDups(200);

//const channels = ['markettraderstv', 'd4rkcide'];
const channels = [];

const tiers = {
	'Prime': '1000',
	'1000': '1000',
	'2000': '2000',
	'3000': '3000',
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
	if (args.prefix !== '$' && args.prefix !== '!') return { success: false, msg, message: 'Just a message', irc_target: target, configs: commander.expectedCommandsConfigs };

	const command = commandsMap.get(args.name);
	if (!command) return { success: false, msg, message: 'Command not found', irc_target: target, configs: commander.expectedCommandsConfigs };

	if(command.configs.prefix !== args.prefix) return { success: false, msg, message: 'Prefix not found', irc_target: target, configs: commander.expectedCommandsConfigs };

	if (allowedUsers.isCommandTesters(user.username) === false) return { success: false, msg, message: 'User not allowed', irc_target: target, configs: commander.expectedCommandsConfigs };

	if (command.configs.irc_in !== type) {
		return { success: false, msg, message: `Wrong irc_in=${command.configs.irc_in} command=${command.configs.name} type=${type}`, irc_target: target, configs: commander.expectedCommandsConfigs };
	}
	
	if(command.configs.enabled === false) return { success: true, msg, message: `Command ${command.configs.name} is not enabled` };

	const selectCooldowns = command.configs.global_cooldown === true ? global_cooldowns : cooldowns;
	const selectedCooldownId = command.configs.global_cooldown === true ? target : user['user-id'];

	const cooldown = command.configs.cooldown || settingsHelper.getProperty(target, 'txCooldownPerUser');
	const settingsConfigs = {
		name: command.configs.name,
		cooldown: cooldown,
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
		channel: target,
		isSub: user.subscriber
	};

	if (commander.validatedEventParameters(event) === false) {
		return { success: false, msg, message: 'Event paramaters missing', irc_target: target, configs: commander.expectedCommandsConfigs };
	}

	const result = await command.execute(event);
	result.msg = msg;
	result.event = event;

	if (result.success === true) {
		messenger.enqueueMessageByType(result.configs.irc_out, result.irc_target, result.message);
		result.result = await messenger.sendQueuedMessagesByType(result.configs.irc_out);
	}

	const model = {
		in_message: result.msg,
		out_message: result.message,
		user_id: result.event.twitchId,
		channel_id: result.event.channelId,
		success: result.success,
	};

	settingsHelper.sendChannelTransaction(model);
	
	return result;
}

async function onMessageHandler(target, user, msg, self) {
	if (self) return { success: false, msg, message: 'Message from self', configs: commander.expectedCommandsConfigs };

	const data = await asyncOnMessageReceived(user['message-type'] || MESSAGE_TYPE.irc_chat, target, user, msg);

	for (let i = 0; i < outMessageCallbacks.length; i++) {
		outMessageCallbacks[i](data);
	}
	return data;
}

/*

Rewards

*/

async function onCheer(channel, userstate, message) {
	duplicateRewardCheck(userstate.id);
	// amount and bitAmount carry the same information
	// amount is for backwards compatibility
	// amount is in the extras handelTipResponse parameter
	return handleRewardEvent(REWARD_TYPE.cheer, channel, userstate.username, { bitAmount: +userstate.bits, amount: +userstate.bits });
}

async function onSubGift(channel, username, streakMonths, recipient, methods, userstate) {
	duplicateRewardCheck(userstate.id);
	return handleRewardEvent(REWARD_TYPE.subgift, channel, username, getExtras(channel, methods.plan));
}

async function onSubscription(channel, username, methods, message, userstate) {
	duplicateRewardCheck(userstate.id);
	return handleRewardEvent(REWARD_TYPE.subscription, channel, username, getExtras(channel, methods.plan));
}

async function onResub(channel, username, months, message, userstate, methods) {
	duplicateRewardCheck(userstate.id);
	return handleRewardEvent(REWARD_TYPE.resub, channel, username, getExtras(channel, methods.plan));
}

function getExtras(channel, plan) {
	const tier = tiers[plan];
	const amounts = {
		'1000': settingsHelper.getProperty(channel, 'tier1SubReward'),
		'2000': settingsHelper.getProperty(channel, 'tier2SubReward'),
		'3000': settingsHelper.getProperty(channel, 'tier3SubReward'),
	};
	return { subTier: tier, amount: +amounts[tier] };
}

/**
 *
 * @param {string} id unique id
 * @throws if the id is not a unique item in the items list
 */
function duplicateRewardCheck(rewardId) {
	rewardedIds.addItem(rewardId);
}

async function handleRewardEvent(type, channel, username, extras) {

	if (!settingsHelper.getProperty(channel, 'ircEventPayments')) return { msg: 'reward events disabled' };

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

	getExtras,

	onCheer,
	onSubGift,
	onSubscription,
	onResub,

	duplicateRewardCheck

};