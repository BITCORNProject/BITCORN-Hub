"use strict";

const serverSettings = require('../../settings/server-settings');
const auth = require('../../settings/auth');
const Queue = require('./utils/queue');
const MESSAGE_TYPE = require('./utils/message-type');

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
	sendQueuedMessagesByType
};