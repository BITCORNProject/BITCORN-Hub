/*
    
*/

"use strict";
const io_client = require('socket.io-client');

const cache = {};
const idMap = {};

const OUTPUT_TYPE = {
	rewardEvent: 0,
	tipEvent: 1
};

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
	channel = cleanChannelName(channel);
	const channelId = idMap[channel];
	return cache[channelId];
}

function setItemsObjects(items) {
	for (const key in items) {
		const item = items[key];
		const channel = cleanChannelName(item.twitchUsername);

		cache[key] = item;
		idMap[channel] = item.ircTarget;
	}
}

function getChannelNames() {
	return Object.keys(idMap);
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
	if(!item) throw new Error(`Missing settinge channel target ${target}`);
	if(!item.hasOwnProperty(name)) throw new Error(`Missing settinge property ${name} for target ${target}`);

	return item[name];
}

function init() {
	try {
		const settings_io = io_client(`http://localhost:${process.env.SETTINGS_SERVER_PORT}`, {
			reconnection: true
		});
		const settingsSocket = settings_io.connect({ reconnect: true });
	
		settingsSocket.on('error', e => {
			console.log(`error settings service server id: ${settingsSocket.id}`, e);
		});
	
		settingsSocket.on('connect', async () => {
			console.log(`connected to settings service server id: ${settingsSocket.id}`);
	
			settingsSocket.emit('initial-settings-request');
		});
	
		settingsSocket.on('initial-settings', req => {
			console.log(req);
			setItemsObjects(req.payload);
		});
	
		settingsSocket.on('update-livestream-settings', async req => {
			console.log(req);
			setItemsObjects({ [req.payload.ircTarget]: req.payload });
		});
	
		settingsSocket.on('disconnect', () => {
			console.log(`disconnected settings service server`);
		});
	} catch (err) {
		console.error(err);
	}
}

module.exports = {
	OUTPUT_TYPE,
	init,
	cleanChannelName,
	setItemsObjects,
	getChannelNames,
	convertMinsToMs,
	txDisabledOutput,
	getIrcMessageTarget,
	txMessageOutput,
	getRainAlgorithmResult,

	/**
	 * generic lookup test
	 */
	getProperty
};