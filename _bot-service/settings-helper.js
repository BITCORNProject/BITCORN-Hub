/*
    
*/

"use strict";
const io_client = require('socket.io-client');

const cache = {};
const idMap = {};

const NOT_RESPONDING_TIMEOUT = 1000;

const OUTPUT_TYPE = {
	rewardEvent: 0,
	tipEvent: 1
};

const redemptionCallbacks = [];

let settings_io = null;
let settingsSocket = null;

// https://stackoverflow.com/a/18391400/2759062
if (!('toJSON' in Error.prototype)) {
	Object.defineProperty(Error.prototype, 'toJSON', {
		value: function () {
			var alt = {};
	
			Object.getOwnPropertyNames(this).forEach(function (key) {
				alt[key] = this[key];
			}, this);
	
			return alt;
		},
		configurable: true,
		writable: true
	});
}

function shuffleArray(array) {
	array.sort(function () {
		return Math.random() - .5;
	});
	return array;
}

function cleanChannelName(channel) {
	return channel.toLowerCase().replace(/#/g, '');
}

function getItem(channel) {
	channel = cleanChannelName(channel).toLowerCase();
	const channelId = idMap[channel];
	return cache[channelId];
}

function setItemsObjects(items) {
	for (const key in items) {
		const item = items[key];
		const channel = cleanChannelName(item.twitchUsername).toLowerCase();

		cache[key] = item;
		idMap[channel] = item.ircTarget;
	}
}

function getChannelNames() {
	return Object.keys(idMap);
}

function getChannelsAndIds() {
	return Object.keys(idMap).map(x => ({ channel: x, channelId: idMap[x] }));
}

function convertMinsToMs(minutes) {
	const MINUTES_AS_MILLISECONDS = 60000;
	return +minutes * MINUTES_AS_MILLISECONDS;
}

function txDisabledOutput({ irc_target, configs }) {
	return { success: false, message: 'Transactions not enabled', irc_target: irc_target, configs: configs };;
}

function getIrcMessageTarget(target, irc_out, MESSAGE_TYPE) {
	const txMessages = getProperty(target, 'txMessages');
	return txMessages || irc_out === MESSAGE_TYPE.irc_whisper ? irc_out : MESSAGE_TYPE.irc_none;
}

function txMessageOutput(type) {
	const messsages = {
		[OUTPUT_TYPE.rewardEvent]: 'Tx Reward Event Message Send Disabled',
		[OUTPUT_TYPE.tipEvent]: 'Tx Tip Event Message Send Disabled'
	};
	return { success: false, message: messsages[type], error: null, result: null };;
}

function getRainAlgorithmResult(target, items) {
	const rainAlgorithm = getProperty(target, 'rainAlgorithm');
	return [
		items.filter(x => x),
		shuffleArray(JSON.parse(JSON.stringify(items.filter(x => x))))
	][rainAlgorithm];
}

/**
 * 
 * @param {string} target the channel name
 * @param {string} name the (case-sensitive) name of the settings property name
 * 
 * @throws if the 'target' or the 'name' is not found
 */
function getProperty(target, name) {
	const item = getItem(target);
	if (!item) throw new Error(`Missing settinge channel target ${target}`);

	const trimmed = {};
	for (const key in item) {
		trimmed[key.trim()] = item[key];
	}

	if (!trimmed.hasOwnProperty(name)) throw new Error(`Missing settinge property ${name} for target ${target}`);

	return trimmed[name];
}

function init() {
	try {
		settings_io = io_client(`http://localhost:${process.env.SETTINGS_SERVER_PORT}`, {
			reconnection: true
		});
		settingsSocket = settings_io.connect({ reconnect: true });

		settingsSocket.on('error', e => {
			console.log({ message: `error settings service server id: ${settingsSocket.id}`, e, timestamp: new Date().toLocaleTimeString() });
		});

		settingsSocket.on('connect', async () => {
			console.log({ message: `connected to settings service server id: ${settingsSocket.id}`, timestamp: new Date().toLocaleTimeString() });

			settingsSocket.emit('initial-settings-request');
		});

		settingsSocket.on('initial-settings', req => {
			setItemsObjects(req.payload);
		});

		settingsSocket.on('reward-redemption', req => {
			const promises = [];
			promises.push(new Error('This happens'));
			for (let i = 0; i < redemptionCallbacks.length; i++) {
				const callback = redemptionCallbacks[i];
				promises.push(callback(req.data));
			}
			Promise.all(promises)
				.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
		});

		settingsSocket.on('update-livestream-settings', req => {
			setItemsObjects({ [req.payload.ircTarget]: req.payload });
		});

		settingsSocket.on('disconnect', () => {
			console.log({ message: `disconnected settings service server`, timestamp: new Date().toLocaleTimeString() });
		});
	} catch (err) {
		console.error(err);
	}
}

async function onRedemption(func) {
	redemptionCallbacks.push(func);
}

function sendChannelActivity({ channel_id, user_id, username }) {
	try {
		settings_io.emit('set-activity-tracker', { channel_id, user_id, username });
	} catch (error) {
		console.error(error);
	}
}

async function getChannelActivity(channel_id, limit_amount) {
	return new Promise((resolve, reject) => {
		try {
			settingsSocket.once('send-activity-tracker', resolve);
			settingsSocket.emit('get-activity-tracker', { channel_id, limit_amount });
			setTimeout(() => reject(`Local data store not responding for getChannelActivity timeout: ${NOT_RESPONDING_TIMEOUT}`), NOT_RESPONDING_TIMEOUT);
		} catch (error) {
			reject(error);
		}
	}).catch(error => console.error({ error, timestamp: new Date().toLocaleTimeString() }));
}

function sendChannelTransaction({ out_message, user_id, channel_id, success }) {
	try {		
		settings_io.emit('set-transaction-tracker', { out_message, user_id, channel_id, success });
	} catch (error) {
		console.error(error);
	}
}

async function getChannelTransaction(channel_id, user_id, limit_amount) {
	return new Promise((resolve, reject) => {
		try {
			settingsSocket.once('send-transaction-tracker', resolve);
			settingsSocket.emit('get-transaction-tracker', { channel_id, user_id, limit_amount });
			setTimeout(() => reject(`Local data store not responding for getChannelTransaction timeout: ${NOT_RESPONDING_TIMEOUT}`), NOT_RESPONDING_TIMEOUT);
		} catch (error) {
			reject(error);
		}
	}).catch(error => console.error({ error, timestamp: new Date().toLocaleTimeString() }));
}

function sendChannelError({ service_tag, user_id, channel_id, error }) {
	try {		
		settings_io.emit('set-error-tracker', { service_tag, user_id, channel_id, error: JSON.stringify(error) });
	} catch (error) {
		console.error(error);
	}
}

async function getChannelError(channel_id, user_id, limit_amount) {
	return new Promise((resolve, reject) => {
		try {
			settingsSocket.once('send-error-tracker', resolve);
			settingsSocket.emit('get-error-tracker', { channel_id, user_id, limit_amount });
			setTimeout(() => reject(`Local data store not responding for getChannelError timeout: ${NOT_RESPONDING_TIMEOUT}`), NOT_RESPONDING_TIMEOUT);
		} catch (error) {
			reject(error);
		}
	}).catch(error => console.error({ error, timestamp: new Date().toLocaleTimeString() }));
}

module.exports = {
	OUTPUT_TYPE,
	init,
	cleanChannelName,
	setItemsObjects,
	getChannelNames,
	getChannelsAndIds,
	convertMinsToMs,
	txDisabledOutput,
	getIrcMessageTarget,
	txMessageOutput,
	getRainAlgorithmResult,

	/**
	 * generic/dynamic property lookup
	 */
	getProperty,

	onRedemption,
	sendChannelActivity,
	getChannelActivity,
	sendChannelTransaction,
	getChannelTransaction,
	sendChannelError,
	getChannelError
};