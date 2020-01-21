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

describe('#mocha promises', function () {
	const isMock = false;

	//let tmi = null;
	//let messenger = null;
	//let databaseAPI = null;

	const tmi = require('./src/tmi');
	const messenger = require('./src/messenger');
	const math = require('./src/utils/math');

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
	} : require('./src/api-interface/database-api');

	const activityTracker = require('./src/activity-tracker');
	const allowedUsers = require('./src/utils/allowed-users');

	async function mockEvent(msg, twitchUsername, channel, irc_target) {

		const auth = require('../settings/auth');
		const user = await fetch(`http://localhost:${auth.data.PORT}/user?username=${twitchUsername}`).then(res => res.json());
		return {
			twitchId: user.id,
			twitchUsername: user.login,
			args: tmi.messageAsCommand(msg),
			irc_target: irc_target,
			channel: channel
		};
	}

	before(() => {

		messenger.chatQueue.client = tmi.chatClient;
		messenger.whisperQueue.client = tmi.whisperClient;

		return Promise.all([
			tmi.connectToChat(),
			tmi.connectToWhisper()
		]);
	});

	after(() => {
		return Promise.all([
			tmi.chatClient.disconnect(),
			tmi.whisperClient.disconnect()
		]);
	});

	it('should have connectToChat property', () => {
		expect(tmi).to.be.ownProperty('connectToChat');
	});

	it('should have connectToWhisper property', () => {
		expect(tmi).to.be.ownProperty('connectToWhisper');
	});

	it('should have tmi join channel', async () => {
		const channel = '#callowcreation';
		const data = await tmi.joinChannel(channel);
		expect(data[0]).to.be.equal(channel);
	});

	it('should handle tmi join errors', () => {
		const channel = null;
		return assert.isRejected(tmi.joinChannel(channel));
	});

	it('should handle tmi part errors', () => {
		const channel = -1;
		return assert.isRejected(tmi.partChannel(channel));
	});

	it('should confirm message received from channel', () => {
		const should = chai.should();
		return new Promise((resolve, reject) => {
			tmi.chatClient.on('message', (target, user, msg, self) => {
				tmi.onMessageHandler(target, user, msg, self)
					.then(obj => {
						expect(obj.msg).to.be.equal('Terra native');
						resolve();
					}).catch(e => reject(e));
			});
			tmi.chatClient.say('#callowcreation', 'Terra native');
		}).should.eventually.fulfilled;
	});

	it('should load commands from file system', () => {
		const moduleloader = require('./src/utils/moduleloader');
		const commandsPath = '../commands';
		const commands = moduleloader(commandsPath);
		expect(commands.length).to.be.greaterThan(0);
	});

	it('should commands loaded have all configs', () => {
		const moduleloader = require('./src/utils/moduleloader');
		const commandsPath = '../commands';
		const commands = moduleloader(commandsPath);

		for (let i = 0; i < commands.length; i++) {
			const configs = commands[i].configs;
			for (const key in tmi.expectedConfigs) {
				expect(Object.keys(configs)).to.include(key);
			}
		}
	});

	it('should have out properties on commands', async () => {
		const callbackPromises = [];

		for (let i = 0; i < tmi.commands.length; i++) {
			const command = tmi.commands[i];

			const target = '#callowcreation';
			const user = { 'user-id': '120524051', username: 'naivebot' };
			const msg = command.configs.example;
			const self = false;

			callbackPromises.push(tmi.onMessageHandler(target, user, msg, self));
		}

		const values = await Promise.all(callbackPromises);

		for (let i = 0; i < values.length; i++) {
			for (const key in tmi.expectedOutProperties) {
				expect(Object.keys(values[i])).to.include(key);
			}
		}
	});

	it('should tmi has commands', () => {
		expect(tmi.commands.map(x => x.configs.name)).to.include('bitcorn');
	});

	it('should create commands map from commands array', () => {
		const commands = tmi.commands;
		const commandsMap = tmi.createCommandsMap(commands);
		expect(commandsMap).to.have.all.keys('bitcorn', 'tipcorn', 'withdraw', 'help', 'rain');
	});

	it('should have a $ prefix', () => {
		const args = tmi.messageAsCommand('$tipcorn @naivebot 420');
		expect(args.prefix).to.be.equal('$');
	});

	it('should get command and params from chat message', () => {
		const msg = '$tipcorn @naivebot 420';
		const args = tmi.messageAsCommand(msg);
		expect(args.params[0]).to.be.equal('@naivebot');
	});

	it('should utility clean params of @ < >', () => {
		const cleanParams = require('./src/utils/clean-params');

		const msg = '$tipcorn <@naivebot> 420';
		const args = tmi.messageAsCommand(msg);

		const twitchUsername = cleanParams.at(cleanParams.brackets(args.params[0]));

		expect(twitchUsername).to.be.equal('naivebot');
	});

	it('should confirm params is a number', () => {
		const { amount, isNumber } = require('./src/utils/clean-params');

		const msg = '$tipcorn <@naivebot> <420>';
		const args = tmi.messageAsCommand(msg);

		const isNum = isNumber(amount(args.params[1]));

		expect(isNum).to.be.equal(true);
	});

	it('should have command name tipcorn', () => {

		const msg = '$tipcorn <@naivebot> <420>';
		const args = tmi.messageAsCommand(msg);

		expect(args.name).to.be.equal('tipcorn');
	});

	it('should twitchId pass cooldown time', async () => {
		const configs = {
			name: 'bitcorn',
			cooldown: 100 * 1,
			global_cooldown: false,
			description: 'View your BITCORN balance and get a BITCORN wallet address if you are not registered',
			example: '$bitcorn',
			enabled: true
		};

		const twitchId = '120524051';
		const cooldowns = {
			[twitchId]: {
				[configs.name]: (new Date()).getTime() + (+configs.cooldown)
			}
		};

		await _wait(+configs.cooldown + 50);

		const passed = tmi.checkCooldown(configs, twitchId, cooldowns);
		expect(passed).to.be.equal(true);

	});

	it('should channel name cause global cooldown block', async () => {
		const configs = {
			name: 'bitcorn',
			cooldown: 1000 * 1,
			global_cooldown: true,
			description: 'View your BITCORN balance and get a BITCORN wallet address if you are not registered',
			example: '$bitcorn',
			enabled: true
		};

		const channelName = '#callowcreation';
		const global_cooldown = {
			[configs.name]: (new Date()).getTime() + (+configs.cooldown)
		};

		let passed = true;

		await _wait(+configs.cooldown + 500);

		passed = tmi.checkCooldown(configs, channelName, global_cooldown);

		expect(passed).to.be.equal(true);

		await _wait(10);

		passed = tmi.checkCooldown(configs, channelName, global_cooldown);

		expect(passed).to.be.equal(false);
	});

	it('should have all event parameters to execute command', async () => {

		const event = await mockEvent('$bitcorn', 'naivebot', 'callowcreation', '#callowcreation');

		expect(tmi.validatedEventParameters(event)).to.be.equal(true);
	});

	it('should validate and execute command', async () => {

		const event = await mockEvent('$bitcorn', 'naivebot', 'callowcreation', '#callowcreation');

		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/bitcorn');

		const obj = await tmi.validateAndExecute(event, command);
		if (obj.success === false) {
			log(obj.message ? obj.message : `Status: ${obj.status}`);
		}
		expect(obj.success).to.be.equal(true);
	});

	/*
	$bitcorn tests
	*/
	it('should get api response for bitcorn status 500', async () => {
		const twitchId = '123';
		const body = null;
		const result = await databaseAPI.request(twitchId, body).bitcorn();
		expect(result.status).to.be.equal(500);
	});

	it('should get api response for bitcorn twitchUsername:', async () => {
		const twitchId = '120524051';
		const body = null;
		const result = await databaseAPI.request(twitchId, body).bitcorn();
		expect(result).to.be.ownProperty('twitchUsername');
	});

	it('should get api response for bitcorn username to be clayman666', async () => {
		const twitchId = '120524051';
		const body = null;
		const result = await databaseAPI.request(twitchId, body).bitcorn();
		expect(result.twitchUsername).to.be.equal('clayman666');
	});

	it('should get $bitcorn response from invoking execute', async () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/bitcorn');

		const event = await mockEvent('$bitcorn', 'naivebot', 'callowcreation', '#callowcreation');

		const result = await tmi.validateAndExecute(event, command);
		expect(result.success).to.be.not.equal(false);
	});

	// Integration test only ?? !! ??
	it('should execute $bitcorn successfully with message handler', async () => {

		const target = '#callowcreation';
		const user = { 'user-id': '120614707', username: 'naivebot' };
		const msg = '$bitcorn';
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self);
		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('bitcorn');
	});


	/*
	$tipcorn tests
	*/
	it('should get api response for tipcorn status 500', async () => {
		const twitchId = '75987197';
		const body = {
			from: `${twitchId}`,
			to: `twitch|120524051`,
			platform: 'twitch',
			amount: 1,
			columns: ['balance', 'tipped']
		};
		const result = await databaseAPI.request(twitchId, body).tipcorn();
		expect(result.status).to.be.equal(500);
	});

	it('should get api response for tipcorn tipped:', async () => {
		const twitchId = '75987197';
		const body = {
			from: `twitch|75987197`,
			to: `twitch|120524051`,
			platform: 'twitch',
			amount: 1,
			columns: ['balance', 'tipped']
		};
		const results = await databaseAPI.request(twitchId, body).tipcorn();
		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			expect(result.from).to.be.ownProperty('tipped');
			expect(result.to).to.be.ownProperty('tipped');
		}
	});

	it('should get api response for tipcorn username to be callowcreation', async () => {
		const twitchId = '75987197';
		const body = {
			from: `twitch|75987197`,
			to: `twitch|120524051`,
			platform: 'twitch',
			amount: 1,
			columns: ['balance', 'twitchusername']
		};

		const results = await databaseAPI.request(twitchId, body).tipcorn();

		if (results.status) {
			log(results.status);
		}
		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			expect(result.from.twitchusername).to.be.equal('callowcreation');
		}
	});

	it('should get $tipcorn response from invoking execute', async () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/tipcorn');
		const event = await mockEvent('$tipcorn naivebot 100', 'callowcreation', '#callowcreation', '#callowcreation');

		const results = await tmi.validateAndExecute(event, command);

		if (results.status) {
			log(results.status);
		}
		expect(results.success).to.be.equal(true);

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (result.success === false) {
				log('tipcorn Output =>>>>>>>>>> ', result);
			}
			expect(result.success).to.be.equal(true);
		}
	});

	// Integration test only ?? !! ??
	it('should execute $tipcorn successfully with message handler', async () => {
		const target = '#callowcreation';
		const user = { 'user-id': '120524051', username: 'naivebot' };
		const msg = '$tipcorn @wollac 101';
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('tipcorn');
	});

	it('should get $withdraw response from invoking execute', async () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/withdraw');

		const event = await mockEvent('$withdraw 1 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g', 'callowcreation', 'callowcreation', '#callowcreation');

		const results = await tmi.validateAndExecute(event, command);
		expect(results.success).to.be.not.equal(false);
	});

	// Chat message and whisper handler merge into one method
	it('should process whispers and chat messages - chat', async () => {
		await _wait(50);

		const type = require('./src/utils/message-type').irc_chat;
		const target = '#callowcreation';
		const user = { 'user-id': '120524051', username: 'naivebot' };
		const msg = '$tipcorn @callowcreation 102';
		const self = false;

		const obj = await tmi.asyncOnMessageReceived(type, target, user, msg, self);
		expect(obj.success).to.be.equal(true);
	});

	it('should process whispers and chat messages - whisper', async () => {

		await new Promise(resulve => setTimeout(resulve, 50));

		const type = require('./src/utils/message-type').irc_whisper;
		const target = '#callowcreation';
		const user = { 'user-id': '120524051', username: 'callowcreation' };
		const msg = '$withdraw 1 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g';
		const self = false;

		const obj = await tmi.asyncOnMessageReceived(type, target, user, msg, self);

		expect(obj.success).to.be.equal(true);
	});


	// chat and whisper queue
	it('should add items to chat queue', () => {
		while (tmi.chatQueue.size() > 0) tmi.chatQueue.dequeue();
		tmi.chatQueue.enqueue({ test_item: 'No name' });
		expect(tmi.chatQueue.size()).to.be.equal(1);
	});

	it('should remove items from chat queue', () => {
		tmi.chatQueue.dequeue();
		expect(tmi.chatQueue.size()).to.be.equal(0);
	});

	it('should not enqueue MESSAGE_TYPE whisper self', () => {

		const MESSAGE_TYPE = require('./src/utils/message-type');
		const auth = require('../settings/auth');

		let target = 'naivebot';
		let message = 'We can see the thing';
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_whisper, target, message);
		const targetName = tmi.whisperQueue.peek();
		expect(targetName.target).to.be.not.equal(auth.data.BOT_USERNAME);
	});

	it('should queue messages to send by MESSAGE_TYPE', () => {

		const MESSAGE_TYPE = require('./src/utils/message-type');

		while (tmi.whisperQueue.size() > 0) tmi.whisperQueue.dequeue();
		while (tmi.chatQueue.size() > 0) tmi.chatQueue.dequeue();

		let target = 'callowcreation';
		let message = 'We can see the thing';
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);
		expect(tmi.chatQueue.size()).to.be.equal(1);
		expect(tmi.whisperQueue.size()).to.be.equal(0);

		target = 'callowcreation';
		message = 'Is this for you';
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_whisper, target, message);
		expect(tmi.chatQueue.size()).to.be.equal(1);
		expect(tmi.whisperQueue.size()).to.be.equal(1);
	});

	it('should confirm messages in chat and whisper queue', () => {
		const item = tmi.chatQueue.peek();
		expect(item.message).to.be.equal('We can see the thing');
	});

	it('should send chat message from queue', async () => {
		const MESSAGE_TYPE = require('./src/utils/message-type');

		let target = '#callowcreation';
		let message = 'should send chat message from queue ' + Date.now();
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);

		await tmi.joinChannel(target);

		const obj = await tmi.sendQueuedMessagesByType(MESSAGE_TYPE.irc_chat);
		_error(obj);
		_message(obj);
		expect(obj.success).to.be.equal(true);
	});

	it('should send many message from chat queue', async () => {

		await new Promise(resulve => setTimeout(resulve, 500));

		const MESSAGE_TYPE = require('./src/utils/message-type');

		let target = '#callowcreation';
		let message = 'should send many message from chat queue ' + Date.now();
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);

		message = 'Seen ' + Date.now();
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);

		await tmi.joinChannel(target);
		const obj = await tmi.sendQueuedMessagesByType(MESSAGE_TYPE.irc_chat);
		_error(obj);
		_message(obj);
		expect(obj.success).to.be.equal(true);
	});

	it('should send whisper message from whisper queue', async () => {
		const MESSAGE_TYPE = require('./src/utils/message-type');

		let target = '#callowcreation';
		let message = 'should send whisper message from whisper queue ' + Date.now();
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_whisper, target, message);

		const obj = await tmi.sendQueuedMessagesByType(MESSAGE_TYPE.irc_whisper);
		_error(obj);
		_message(obj);
		expect(obj.success).to.be.equal(true);
	});

	it('should invoke help with message handler', async () => {

		const target = '#callowcreation';
		const user = { 'user-id': '120614707', username: 'naivebot' };
		const msg = '$help';
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self);
		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('help');
	});

	it('should allow testers when not live/published', () => {
		let username = 'bitcornhub';
		let allowed = allowedUsers.isCommandTesters(username);
		expect(allowed).to.be.equal(false);

		username = 'biteastwood';
		allowed = allowedUsers.isCommandTesters(username);
		expect(allowed).to.be.equal(true);
	});

	it('should ommit usernames from activity tracker verified', () => {
		let username = 'bitcornhub';
		let verified = allowedUsers.activityTrackerOmitUsername(username);
		expect(verified).to.be.equal(true);

		username = 'Mopynatv';
		verified = allowedUsers.activityTrackerOmitUsername(username);
		expect(verified).to.be.equal(false);
	});

	it('should get $rain response from invoking execute', async () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/rain');
		const event = await mockEvent('$rain 24.999999999999999 5', 'wollac', '#callowcreation', '#callowcreation');
		const result = await tmi.validateAndExecute(event, command);
		expect(result.success).to.be.not.equal(false);
	});

	// Integration test only ?? !! ??
	it('should execute $rain successfully with message handler', async () => {

		const twitchUsername = 'naivebot';

		const auth = require('../settings/auth');
		const {id: user_id, login: user_login} = await fetch(`http://localhost:${auth.data.PORT}/user?username=${twitchUsername}`).then(res => res.json());
			
		const target = '#callowcreation';
		const user = { 'user-id': user_id, username: user_login };
		const msg = '$rain 24.999999999999999 5';
		const self = false;
		
		const obj = await tmi.onMessageHandler(target, user, msg, self);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj, obj.message);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('rain');
	});

	it.only('should get $blacklist response from invoking execute', async () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/blacklist');
		const event = await mockEvent('$blacklist @wollac', 'wollac', '#callowcreation', '#callowcreation');
		const result = await tmi.validateAndExecute(event, command);
		expect(result.success).to.be.not.equal(false);
	});
});