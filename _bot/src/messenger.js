"use strict";
const fetch = require('node-fetch');

const serverSettings = require('../../settings/server-settings');
const auth = require('../../settings/auth');
const Queue = require('./utils/queue');
const MESSAGE_TYPE = require('./utils/message-type');

const amounts = {
	cheer: {
		'0000': 10
	},
	subgift: {
		'Prime': 420,
		'1000': 420,
		'2000': 4200,
		'3000': 42000
	},
	subscription: {
		'Prime': 420,
		'1000': 420,
		'2000': 4200,
		'3000': 42000
	},
	resub: {
		'Prime': 420,
		'1000': 420,
		'2000': 4200,
		'3000': 42000
	}
};

function _Queue() {
	this.items = new Queue();
	this.isBusy = false;
	this.attempts = 0;
	this.client = null;

	this.size = function () { return this.items.size(); }
	this.peek = function () { return this.items.peek(); }
	this.enqueue = function (item) { return this.items.enqueue(item); }
	this.dequeue = function () { return this.items.dequeue(); }
}

const chatQueue = new _Queue();
const whisperQueue = new _Queue();

const rewardQueue = new _Queue();

/*

Rewards

*/
async function onCheer(channel, userstate, message) { // <----
	const username = userstate.username;
	const amount = userstate.bits * amounts.cheer['0000'];
	rewardQueue.enqueue({ type: 'cheer', channel, username, amount });
	return sendQueuedRewards();
}

async function onSubGift(channel, username, streakMonths, recipient, methods, userstate) { // <----
	const amount = amounts.subgift[methods.plan];
	rewardQueue.enqueue({ type: 'subgift', channel, username, amount });
	return sendQueuedRewards();
}

async function onSubscription(channel, username, methods, message, userstate) { // <----
	const amount = amounts.subscription[methods.plan];
	rewardQueue.enqueue({ type: 'subscription', channel, username, amount });
	return sendQueuedRewards();
}

async function onResub(channel, username, months, message, userstate, methods) { // <----
	const amount = amounts.resub[methods.plan];
	rewardQueue.enqueue({ type: 'subscription', channel, username, amount });
	return sendQueuedRewards();
}

async function sendQueuedRewards() {

	await new Promise(resolve => setTimeout(resolve, 10));

	let success = false;
	let error = null;

	const queue = rewardQueue;

	/*console.log(' ----------------- queue ----------------- ', {
		isBusy: queue.isBusy,
		attempts: queue.attempts,
		size: queue.size(),
		peek: queue.peek()
	});*/

	if (queue.size() === 0) return { success, message: `rewards queue is empty`, error };

	if (queue.isBusy === true) return { success, message: `rewards queue is busy with size: ${queue.size()}`, error };

	queue.isBusy = true;

	const item = queue.peek();

	let result = { message: 'No Result' };
	try {

		result = await handleTipRewards(item.type, item.channel, item.username, item.amount);

		queue.dequeue();
		success = true;
	} catch (err) {
		error = err;
	}

	await new Promise(resolve => setTimeout(resolve, serverSettings.data.IRC_DELAY_MS));

	queue.isBusy = false;
	if (error) {
		queue.attempts++;
	} else {
		queue.attempts = 0;
	}
	const outMessage = error ? `Failed to send message type for reward on ${queue.attempts} attempts` : `Sent message: ${result.message}`;

	/*console.log(' ----------------- outMessage ----------------- ', {
		success, message: outMessage, error
	});*/
	await sendQueuedRewards();

	return { success, message: outMessage, error, result };
}

async function handleTipRewards(type, channel, username, amount) {

	const commandHelper = require('./shared-lib/command-helper');
	const databaseAPI = require('./api-interface/database-api');

	const authValues = auth.getValues();
	const fromUser = await fetch(`http://localhost:${authValues.PORT}/user?username=${authValues.BOT_USERNAME}`).then(res => res.json());
	const toUser = await fetch(`http://localhost:${authValues.PORT}/user?username=${username}`).then(res => res.json());

	const body = {
		from: `twitch|${fromUser.id}`,
		to: `twitch|${toUser.id}`,
		platform: 'twitch',
		amount: amount,
		columns: ['balance', 'twitchusername', 'isbanned']
	};

	const result = await databaseAPI.request(fromUser.id, body).tipcorn();
	const { success, message } = commandHelper.handelTipResponse(result, fromUser.login, amount);

	if (success === true) {
		enqueueMessageByType(MESSAGE_TYPE.irc_chat, channel, message);
		return sendQueuedMessagesByType(MESSAGE_TYPE.irc_chat);
	}
	return { success, message, type, channel, username, amount };
}

/*

Chats whispers

*/
function enqueueMessageByType(type, target, message) {
	if (type === MESSAGE_TYPE.irc_chat) {
		chatQueue.enqueue({ target, message });
	} else if (type === MESSAGE_TYPE.irc_whisper) {
		if (target.toLowerCase() !== auth.getValues().BOT_USERNAME.toLowerCase()) {
			whisperQueue.enqueue({ target, message });
		} else {
			console.error(`Bot ${auth.getValues().BOT_USERNAME} attempt to whisper self`);
		}
	} else {
		throw new Error(`${type} ${target} ${message}`);
	}
}

async function sendQueuedMessagesByType(type) {

	await new Promise(resolve => setTimeout(resolve, 10));

	let success = false;
	let error = null;

	const queue = type === MESSAGE_TYPE.irc_chat ? chatQueue : whisperQueue;

	/*console.log(' ----------------- queue ----------------- ', {
		type,
		isBusy: queue.isBusy,
		attempts: queue.attempts,
		size: queue.size(),
		peek: queue.peek()
	});*/

	if (queue.size() === 0) return { success, message: `${type} queue is empty`, error };

	if (queue.isBusy === true) return { success, message: `${type} queue is busy with size: ${queue.size()}`, error };

	queue.isBusy = true;

	const item = queue.peek();

	let result = 'No Result';
	try {
		if (type === MESSAGE_TYPE.irc_chat) {
			result = await queue.client.say(item.target, item.message)
				.catch(e => {
					throw new Error(`${type} channel [queue-size: ${queue.size()}]: ${e}`);
				});
		} else if (type === MESSAGE_TYPE.irc_whisper) {
			result = await queue.client.whisper(item.target, item.message)
				.catch(e => {
					throw new Error(`${type} message [queue-size: ${queue.size()}]: ${e}`);
				});
		} else {
			throw new Error(`Send queue item ${type} ${item.target} ${item.message}`);
		}
		queue.dequeue();
		success = true;
	} catch (err) {
		error = err;
	}

	await new Promise(resolve => setTimeout(resolve, serverSettings.data.IRC_DELAY_MS));

	queue.isBusy = false;
	if (error) {
		queue.attempts++;
		if (type === MESSAGE_TYPE.irc_whisper) {
			queue.dequeue();
		}
	} else {
		queue.attempts = 0;
	}
	const outMessage = error ? `Failed to send message type ${type} on ${queue.attempts} attempts` : `Sent message: ${item.message}`;

	/*console.log(' ----------------- outMessage ----------------- ', {
		success, message: outMessage, error
	});*/
	await sendQueuedMessagesByType(type);

	return { success, message: outMessage, error, result };
}

module.exports = {
	chatQueue,
	whisperQueue,
	enqueueMessageByType,
	sendQueuedMessagesByType,

	handleTipRewards,

	amounts,

	onCheer,
	onSubGift,
	onSubscription,
	onResub
};