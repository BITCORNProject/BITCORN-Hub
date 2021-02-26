"use strict";

const { is_production } = require('../prod');
const serverSettings = require('../settings/server-settings');
const auth = require('../settings/auth');
const Queue = require('./utils/queue');
const MESSAGE_TYPE = require('./utils/message-type');
const settingsHelper = require('./utils/settings-helper');

const { getChannelId, cleanChannelName } = require('./api-interface/settings-cache');

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

const MAX_QUEUE_RETRIES = 20;

const chatQueue = new _Queue();
const whisperQueue = new _Queue();

const rewardQueue = new _Queue();

function enqueueReward(type, channel, username, amount) {
	rewardQueue.enqueue({ type, channel, username, amount });
}
/* w3rk
c = 0; 
n = time.now(); 
for { 
	if c < 100 {
	 msg<- deque(msg) 
	dosmth(msg) 
	timeToSleep = 31 - time.now() - n; 

	if timeToSleep > 0 { sleep(timeToSleep); } 
	c++;
}else { 
	c=0; 
}}*/

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

	await new Promise(resolve => setTimeout(resolve, serverSettings.IRC_DELAY_MS));

	queue.isBusy = false;
	if (error) {
		queue.attempts++;
	} else {
		queue.attempts = 0;
	}
	let outMessage = error ? `Failed to send message type for reward on ${queue.attempts} attempts` : `Sent message: ${result.message}`;

	if (queue.attempts >= MAX_QUEUE_RETRIES) {
		queue.dequeue();
		outMessage = `${outMessage} **** ${MAX_QUEUE_RETRIES} MAX_QUEUE_RETRIES ${JSON.stringify(item)}`;
	}

	/*console.log(' ----------------- outMessage ----------------- ', {
		success, message: outMessage, error
	});*/
	await sendQueuedRewards();

	return { success, message: outMessage, error, result };
}

async function handleTipRewards(type, channel, username, amount) {

	const commandHelper = require('./shared-lib/command-helper');
	const databaseAPI = require('./api-interface/database-api');
	const { getUsers } = require('./api-interface/twitch-api');

	const { data: [toUser] } = await getUsers([username]);

	const fromUserId = await getChannelId(channel);
	const body = {
		ircTarget: fromUserId,
		from: `twitch|${fromUserId}`,
		to: `twitch|${toUser.id}`,
		platform: 'twitch',
		amount: amount,
		columns: ['balance', 'twitchusername', 'isbanned']
	};

	const result = await databaseAPI.request(fromUserId, body).tipcorn();
	const { success, message } = commandHelper.handelTipResponse(result, cleanChannelName(channel), toUser.login, amount);
	
	if (settingsHelper.getIrcMessageTarget(channel, MESSAGE_TYPE.irc_chat) === MESSAGE_TYPE.irc_none) {
		return settingsHelper.txMessageOutput(settingsHelper.OUTPUT_TYPE.tipEvent);
	}

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
		if (target.toLowerCase() !== auth.BOT_USERNAME.toLowerCase()) {
			whisperQueue.enqueue({ target, message });
		} else {
			console.error(`Bot ${auth.BOT_USERNAME} attempt to whisper self`);
		}
	} else {
		//console.log(`${type} ${target} ${message}`);
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
	const item_message = is_production ? item.message : `(TESTMODE) ${item.message} (TESTMODE)`
	try {
		if (type === MESSAGE_TYPE.irc_chat) {
			result = await queue.client.say(item.target, item_message)
				.catch(e => {
					throw new Error(`${type} channel [queue-size: ${queue.size()}]: ${e}`);
				});
		} else if (type === MESSAGE_TYPE.irc_whisper) {
			result = await queue.client.whisper(item.target, item_message)
				.catch(e => {
					throw new Error(`${type} message [queue-size: ${queue.size()}]: ${e}`);
				});
		} else {
			throw new Error(`Send queue item ${type} ${item.target} ${item_message}`);
		}
		queue.dequeue();
		success = true;
	} catch (err) {
		error = err;
	}

	await new Promise(resolve => setTimeout(resolve, serverSettings.IRC_DELAY_MS));

	queue.isBusy = false;
	if (error) {
		queue.attempts++;
		if (type === MESSAGE_TYPE.irc_whisper) {
			queue.dequeue();
		}
	} else {
		queue.attempts = 0;
	}
	let outMessage = error ? `Failed to send message type ${type} on ${queue.attempts} attempts` : `Sent message: ${item.message}`;

	if (queue.attempts >= MAX_QUEUE_RETRIES) {
		queue.dequeue();
		outMessage = `${outMessage} **** ${MAX_QUEUE_RETRIES} MAX_QUEUE_RETRIES ${JSON.stringify(item)}`;
	}

	/*console.log(' ----------------- outMessage ----------------- ', {
		success, message: outMessage, error
	});*/
	await sendQueuedMessagesByType(type);

	return { success, message: outMessage, error, result };
}

module.exports = {
	chatQueue,
	whisperQueue,
	rewardQueue,
	enqueueMessageByType,
	enqueueReward,
	sendQueuedMessagesByType,
	sendQueuedRewards,

	handleTipRewards
};