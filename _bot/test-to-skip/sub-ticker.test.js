"use strict";

const chai = require('chai');
const { expect, assert } = chai;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const fetch = require('node-fetch');

function log(...value) {
	console.log(value);
}

function _error(obj) {
	if (obj.error) {
		log(obj);
	}
}

function _message(obj) {
	if (obj.success && obj.success === false && obj.message) {
		log(obj);
	}
}

async function _wait(ms) {
	return new Promise(resulve => setTimeout(resulve, ms));
}

describe.skip('#sub ticker', function () {
	
	this.timeout(30000);

	const isMock = false;

	//let tmi = null;
	//let messenger = null;
	//let databaseAPI = null;

	const tmi = require('../src/tmi');
	const messenger = require('../src/messenger');
	const commander = require('../src/commander');
	const math = require('../src/utils/math');
	const twitchAPI = require('../src/api-interface/twitch-api');

	const serverSettings = require('../settings/server-settings');

	const databaseAPI = isMock ? {
		request(twitchId, body) {
			return {
				bitcorn: () => Promise.resolve({ status: 500, twitchUsername: 'clayman666' }),
				tipcorn: () => Promise.resolve({ status: 500 }),
				withdraw: () => Promise.resolve({ status: 500 }),
				tipcorn: () => Promise.resolve({ status: 500 })
			}
		}
	} : require('../src/api-interface/database-api');

	const activityTracker = require('../src/activity-tracker');
	const allowedUsers = require('../src/utils/allowed-users');

	async function mockEvent(msg, twitchUsername, channel, irc_target) {

		const user = await twitchAPI.getUserColumns(twitchUsername, ['id', 'login']);

		return {
			twitchId: user.id,
			twitchUsername: user.login,
			args: commander.messageAsCommand(msg),
			irc_target: irc_target,
			channel: channel
		};
	}

	before(() => {

		messenger.chatQueue.client = tmi.chatClient;
		messenger.whisperQueue.client = tmi.whisperClient;

		activityTracker.init();

		return tmi.connectToChat();
	});

	after(() => {
		return Promise.all([
			tmi.chatClient.disconnect()
		]);
	});

	it('should send sub ticker payout request', async () => {

		const MINUTE_AWARD_MULTIPLIER = serverSettings.MINUTE_AWARD_MULTIPLIER;
		let viewers = [];

		const channel = 'callowcreation'; //'markettraderstv';
		const url = `https://tmi.twitch.tv/group/user/${channel}/chatters`;
		const chatters_result = await fetch(url);
		const chatters_json = await chatters_result.json();
		viewers = [];
		for (const key in chatters_json) {
			const chatters = chatters_json[key];
			for (const k in chatters) {
				if (k === 'broadcaster') continue;
				viewers = viewers.concat(chatters[k]);
			}
		}

		log(viewers.length);

		const promises = [];
		let chatters = [];
		while (viewers.length > 0) {
			const chunked = viewers.splice(0, 100);
			promises.push(new Promise(async (resolve) => {
				const users = await twitchAPI.getUsersId(chunked);
				log(users);
				resolve(users.map(x => x.id));
			}));
		}
		const presults = await Promise.all(promises);
		chatters = [].concat.apply([], presults);

		//log(chatters.length);
		chatters.length = 5;

		//log(chatters);

		const body = {
			chatters: chatters,
			minutes: MINUTE_AWARD_MULTIPLIER
		};

		const { id: senderId } = await twitchAPI.getUserId(process.env.BOT_USERNAME);

		console.log(`---------------> ${senderId}`);

		const results = await databaseAPI.requestPayout(senderId, body);

		log(body, results.status);

		expect(results).to.be.greaterThan(0);
	});

	it('should perform sub ticker after init', async () => {
		const subTicker = require('../src/sub-ticker');

		const channel = 'callowcreation';

		const initResult = await subTicker.init();
		expect(initResult.success).to.be.equal(true);

		const results = await subTicker.performPayout(channel);

		expect(results).to.be.greaterThan(0);

	});
});