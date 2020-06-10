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

describe.skip('#withdraw', function () {
	
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

	// Chat message and whisper handler merge into one method
	it('should get $withdraw response from invoking execute', async () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('../src/commands/withdraw');

		const event = await mockEvent('$withdraw 1 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g', 'callowcreation', 'callowcreation', '#callowcreation');

		const results = await commander.validateAndExecute(event, command);
		expect(results.success).to.be.not.equal(false);
	});
	it('should process whispers and chat messages - whisper', async () => {

		await new Promise(resulve => setTimeout(resulve, 50));

		const type = require('../src/utils/message-type').irc_whisper;
		const target = '#callowcreation';

		const twitchUsername = 'callowcreation';
		const { id: user_id, login: user_login } = await twitchAPI.getUserColumns(twitchUsername, ['id', 'login']);
		const user = { 'user-id': user_id, username: user_login };

		const msg = `${commander.commandName('$withdraw')} 1 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g`;
		const self = false;
		
		const obj = await tmi.asyncOnMessageReceived(type, target, user, msg, self);

		expect(obj.success).to.be.equal(true);
		expect(obj.message).to.be.not.equal(`You failed to withdraw: insufficient funds`);
	});

	it('should process withdraw insufficient funds', async () => {

		await new Promise(resulve => setTimeout(resulve, 50));

		const type = require('../src/utils/message-type').irc_whisper;
		const target = '#callowcreation';

		const twitchUsername = 'callowcreation';
		const { id: user_id, login: user_login } = await twitchAPI.getUserColumns(twitchUsername, ['id', 'login']);
		const user = { 'user-id': user_id, username: user_login };

		const msg = `${commander.commandName('$withdraw')} 4200000001 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g`;
		const self = false;

		const obj = await tmi.asyncOnMessageReceived(type, target, user, msg, self);

		expect(obj.success).to.be.equal(true);
		expect(obj.message).to.be.equal(`You failed to withdraw: insufficient funds`);
	});
});