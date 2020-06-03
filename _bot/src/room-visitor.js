"use strict";


const fs = require('fs');
const _ = require('lodash');

let joinedChannels = [];
const filename = './settings/channels.json';

module.exports = async (tmi) => {

	async function partChannels(tmi, leaves) {
		for (let i = 0; i < leaves.length; i++) {
			const result = await tmi.partChannel(leaves[i]);
			console.log({ left_channel: result.join() });
		}
	}

	async function joinChannels(tmi, joins) {
		for (let i = 0; i < joins.length; i++) {
			const result = await tmi.joinChannel(joins[i]);
			console.log({ join_channel: result.join() });
		}
	}

	try {

		const channels = JSON.parse(fs.readFileSync(filename, 'utf-8'));
		
		console.log({ 'channels': channels.join() });

		joinedChannels = channels;

		await joinChannels(tmi, joinedChannels);

	} catch (error) {
		console.log(error);
	}

	fs.watchFile(filename, async (cur, prev) => {
		try {
			const channels = JSON.parse(fs.readFileSync(filename, 'utf-8'));

			const leaves = _.difference(joinedChannels, channels);
			const joins = _.difference(channels, joinedChannels);

			await partChannels(tmi, leaves);

			await joinChannels(tmi, joins);

			joinedChannels = channels;
		} catch (error) {
			console.log(error);
		}
	});
	return { success: false };
};