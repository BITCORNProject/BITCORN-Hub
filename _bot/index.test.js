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

describe('#mocha promises', function () {
	const isMock = false;

	//let tmi = null;
	//let messenger = null;
	//let databaseAPI = null;

	const tmi = require('./src/tmi');
	const messenger = require('./src/messenger');
	const commander = require('./src/commander');
	const math = require('./src/utils/math');

	const serverSettings = require('./settings/server-settings');

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

		const auth = require('./settings/auth');
		const user = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());
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
			Object.entries(commander.expectedCommandsConfigs).forEach(entry => {
				let key = entry[0];
				expect(Object.keys(configs)).to.include(key);
			});
		}
	});

	it('should have out properties on commands', async () => {
		const callbackPromises = [];
		for (let i = 0; i < commander.commands.length; i++) {
			const command = commander.commands[i];

			const target = '#callowcreation';
			const user = { 'user-id': '120524051', username: 'naivebot' };
			const msg = command.configs.example;
			const self = false;

			callbackPromises.push(tmi.onMessageHandler(target, user, msg, self));
		}

		const values = await Promise.all(callbackPromises);

		for (let i = 0; i < values.length; i++) {
			Object.entries(commander.expectedOutProperties).forEach(entry => {
				let key = entry[0];
				expect(Object.keys(values[i])).to.include(key);
			});
		}
	});

	it('should tmi has commands', () => {
		expect(commander.commands.map(x => x.configs.name)).to.include('bitcorn');
	});

	it('should create commands map from commands array', () => {
		const commandsMap = commander.createCommandsMap();
		const commandNames = ['bitcorn', 'tipcorn', 'withdraw', 'help', 'rain', 'blacklist'];
		const mapped = commandNames.map(commander.commandName);
		expect(commandsMap).to.have.all.keys(mapped);
	});

	it('should have a $ prefix', () => {
		const args = commander.messageAsCommand('$tipcorn @naivebot 420');
		expect(args.prefix).to.be.equal('$');
	});

	it('should get command and params from chat message', () => {
		const msg = '$tipcorn @naivebot 420';
		const args = commander.messageAsCommand(msg);
		expect(args.params[0]).to.be.equal('@naivebot');
	});

	it('should utility clean params of @ < >', () => {
		const cleanParams = require('./src/utils/clean-params');

		const msg = '$tipcorn <@naivebot> 420';
		const args = commander.messageAsCommand(msg);

		const twitchUsername = cleanParams.at(cleanParams.brackets(args.params[0]));

		expect(twitchUsername).to.be.equal('naivebot');
	});

	it('should confirm params is a number', () => {
		const { amount, isNumber } = require('./src/utils/clean-params');

		const msg = '$tipcorn <@naivebot> <420>';
		const args = commander.messageAsCommand(msg);

		const isNum = isNumber(amount(args.params[1]));

		expect(isNum).to.be.equal(true);
	});

	it('should have command name tipcorn', () => {

		const msg = '$tipcorn <@naivebot> <420>';
		const args = commander.messageAsCommand(msg);

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

		const passed = commander.checkCooldown(configs, twitchId, cooldowns);
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

		passed = commander.checkCooldown(configs, channelName, global_cooldown);

		expect(passed).to.be.equal(true);

		await _wait(10);

		passed = commander.checkCooldown(configs, channelName, global_cooldown);

		expect(passed).to.be.equal(false);
	});

	it('should have all event parameters to execute command', async () => {

		const event = await mockEvent('$bitcorn', 'naivebot', 'callowcreation', '#callowcreation');

		expect(commander.validatedEventParameters(event)).to.be.equal(true);
	});

	it('should validate and execute command', async () => {

		const event = await mockEvent('$bitcorn', 'naivebot', 'callowcreation', '#callowcreation');

		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/bitcorn');

		const obj = await commander.validateAndExecute(event, command);
		if (obj.success === false) {
			log(obj.message ? obj.message : `Status: ${obj.status}`);
		}
		expect(obj.success).to.be.equal(true);
	});

	/*
	$bitcorn tests
	*/
	it('should get api response for bitcorn status 404', async () => {
		const twitchId = '123';
		const body = null;
		const result = await databaseAPI.request(twitchId, body).bitcorn();

		expect(result.status).to.be.equal(404);
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

		const result = await commander.validateAndExecute(event, command);
		expect(result.success).to.be.not.equal(false);
	});

	// Integration test only ?? !! ??
	it('should execute $bitcorn successfully with message handler', async () => {

		const target = '#callowcreation';
		const user = { 'user-id': '120614707', username: 'naivebot' };
		const msg = commander.commandName('$bitcorn');
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
			columns: ['balance', 'twitchusername']
		};
		const result = await databaseAPI.request(twitchId, body).tipcorn();
		expect(result.status).to.be.equal(500);
	});

	it('should get api response for tipcorn amountOfTipsSent:', async () => {
		const twitchId = '75987197';
		const body = {
			from: `twitch|75987197`,
			to: `twitch|120524051`,
			platform: 'twitch',
			amount: 1,
			columns: ['balance', 'amountoftipssent']
		};
		const results = await databaseAPI.request(twitchId, body).tipcorn();
		for (let i = 0; i < results.length; i++) {
			const result = results[i]; 
			expect(result.from).to.be.ownProperty('amountoftipssent');
			expect(result.to).to.be.ownProperty('amountoftipssent');
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
		const event = await mockEvent('$tipcorn d4rkcide 100', 'callowcreation', '#callowcreation', '#callowcreation');

		const results = await commander.validateAndExecute(event, command);

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

		const twitchUsername = 'd4rkcide';
		const auth = require('./settings/auth');
		const { id: user_id, login: user_login } = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());
		const user = { 'user-id': user_id, username: user_login };

		const target = '#callowcreation';
		const msg = `${commander.commandName('$tipcorn')} @mattras007 101`;
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('tipcorn');
	});	

	// Integration test only ?? !! ??
	it('should execute $tipcorn insufficient funds with message handler ', async () => {

		const twitchUsername = 'd4rkcide';
		const auth = require('./settings/auth');
		const { id: user_id, login: user_login } = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());
		const user = { 'user-id': user_id, username: user_login };

		const target = '#callowcreation';
		const msg = `${commander.commandName('$tipcorn')} @mattras007 4200000001`;
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('tipcorn');
	});	
	
	it('should execute $tipcorn success for unregistered users with message handler', async () => {

		const twitchUsername = 'd4rkcide';
		const auth = require('./settings/auth');
		const { id: user_id, login: user_login } = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());
		const user = { 'user-id': user_id, username: user_login };

		const target = '#callowcreation';
		const msg = `${commander.commandName('$tipcorn')} @3412q 103`;
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.message).to.include('https://bitcornfarms.com/');
	});

	it('should get $withdraw response from invoking execute', async () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/withdraw');

		const event = await mockEvent('$withdraw 1 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g', 'callowcreation', 'callowcreation', '#callowcreation');

		const results = await commander.validateAndExecute(event, command);
		expect(results.success).to.be.not.equal(false);
	});

	// Chat message and whisper handler merge into one method
	it('should process whispers and chat messages - chat', async () => {
		await _wait(50);

		const type = require('./src/utils/message-type').irc_chat;
		const target = '#callowcreation';

		const twitchUsername = 'd4rkcide';
		const auth = require('./settings/auth');
		const { id: user_id, login: user_login } = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());
		const user = { 'user-id': user_id, username: user_login };

		const msg = `${commander.commandName('$tipcorn')} @biteastwood 102`;
		const self = false;

		const obj = await tmi.asyncOnMessageReceived(type, target, user, msg, self);
		expect(obj.success).to.be.equal(true);
	});

	it('should process whispers and chat messages - whisper', async () => {

		await new Promise(resulve => setTimeout(resulve, 50));

		const type = require('./src/utils/message-type').irc_whisper;
		const target = '#callowcreation';

		const twitchUsername = 'callowcreation';
		const auth = require('./settings/auth');
		const { id: user_id, login: user_login } = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());
		const user = { 'user-id': user_id, username: user_login };

		const msg = `${commander.commandName('$withdraw')} 1 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g`;
		const self = false;

		const obj = await tmi.asyncOnMessageReceived(type, target, user, msg, self);

		expect(obj.success).to.be.equal(true);
		expect(obj.message).to.be.not.equal(`You failed to withdraw: insufficient funds`);
	});

	it('should process withdraw insufficient funds', async () => {

		await new Promise(resulve => setTimeout(resulve, 50));

		const type = require('./src/utils/message-type').irc_whisper;
		const target = '#callowcreation';

		const twitchUsername = 'callowcreation';
		const auth = require('./settings/auth');
		const { id: user_id, login: user_login } = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());
		const user = { 'user-id': user_id, username: user_login };

		const msg = `${commander.commandName('$withdraw')} 4200000001 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g`;
		const self = false;

		const obj = await tmi.asyncOnMessageReceived(type, target, user, msg, self);

		expect(obj.success).to.be.equal(true);
		expect(obj.message).to.be.equal(`You failed to withdraw: insufficient funds`);
	});


	// chat and whisper queue
	it('should add items to chat queue', () => {
		while (messenger.chatQueue.size() > 0) messenger.chatQueue.dequeue();
		messenger.chatQueue.enqueue({ test_item: 'No name' });
		expect(messenger.chatQueue.size()).to.be.equal(1);
	});

	it('should remove items from chat queue', () => {
		messenger.chatQueue.dequeue();
		expect(messenger.chatQueue.size()).to.be.equal(0);
	});

	it('should not enqueue MESSAGE_TYPE whisper self', () => {

		const MESSAGE_TYPE = require('./src/utils/message-type');
		const auth = require('./settings/auth');

		let target = 'naivebot';
		let message = 'We can see the thing';
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_whisper, target, message);
		const targetName = messenger.whisperQueue.peek();
		expect(targetName.target).to.be.not.equal(auth.BOT_USERNAME);
	});

	it('should queue messages to send by MESSAGE_TYPE', () => {

		const MESSAGE_TYPE = require('./src/utils/message-type');

		while (messenger.whisperQueue.size() > 0) messenger.whisperQueue.dequeue();
		while (messenger.chatQueue.size() > 0) messenger.chatQueue.dequeue();

		let target = 'callowcreation';
		let message = 'We can see the thing';
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);
		expect(messenger.chatQueue.size()).to.be.equal(1);
		expect(messenger.whisperQueue.size()).to.be.equal(0);

		target = 'callowcreation';
		message = 'Is this for you';
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_whisper, target, message);
		expect(messenger.chatQueue.size()).to.be.equal(1);
		expect(messenger.whisperQueue.size()).to.be.equal(1);
	});

	it('should confirm messages in chat and whisper queue', () => {
		const item = messenger.chatQueue.peek();
		expect(item.message).to.be.equal('We can see the thing');
	});

	it('should send chat message from queue', async () => {
		const MESSAGE_TYPE = require('./src/utils/message-type');

		let target = '#callowcreation';
		let message = 'should send chat message from queue ' + Date.now();
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);

		await tmi.joinChannel(target);

		const obj = await messenger.sendQueuedMessagesByType(MESSAGE_TYPE.irc_chat);
		_error(obj);
		_message(obj);
		expect(obj.success).to.be.equal(true);
	});

	it('should send many message from chat queue', async () => {

		await new Promise(resulve => setTimeout(resulve, 500));

		const MESSAGE_TYPE = require('./src/utils/message-type');

		let target = '#callowcreation';
		let message = 'should send many message from chat queue ' + Date.now();
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);

		message = 'Seen ' + Date.now();
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);

		await tmi.joinChannel(target);
		const obj = await messenger.sendQueuedMessagesByType(MESSAGE_TYPE.irc_chat);
		_error(obj);
		_message(obj);
		expect(obj.success).to.be.equal(true);
	});

	it('should send whisper message from whisper queue', async () => {
		const MESSAGE_TYPE = require('./src/utils/message-type');

		let target = '#callowcreation';
		let message = 'should send whisper message from whisper queue ' + Date.now();
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_whisper, target, message);

		const obj = await messenger.sendQueuedMessagesByType(MESSAGE_TYPE.irc_whisper);
		_error(obj);
		_message(obj);
		expect(obj.success).to.be.equal(true);
	});

	it('should invoke help with message handler', async () => {

		const target = '#callowcreation';
		const user = { 'user-id': '120614707', username: 'naivebot' };
		const msg = commander.commandName('$help');
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
		const event = await mockEvent('$rain 24.999999999999999 5', 'd4rkcide', '#callowcreation', '#callowcreation');
		const result = await commander.validateAndExecute(event, command);
		expect(result.success).to.be.not.equal(false);
	});

	// Integration test only ?? !! ??
	it('should execute $rain successfully with message handler', async () => {

		const twitchUsername = 'd4rkcide';

		const auth = require('./settings/auth');
		const { id: user_id, login: user_login } = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());

		const target = '#callowcreation';
		const user = { 'user-id': user_id, username: user_login };
		const msg = `${commander.commandName('$rain')} 24.999999999999999 10`;
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj, obj.message);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('rain');
	});

	// Integration test only ?? !! ??
	it('should execute $rain insufficient funds with message handler', async () => {

		const twitchUsername = 'd4rkcide';

		const auth = require('./settings/auth');
		const { id: user_id, login: user_login } = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());

		const target = '#callowcreation';
		const user = { 'user-id': user_id, username: user_login };
		const msg = `${commander.commandName('$rain')} 4200000024.999999999999999 10`;
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj, obj.message);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('rain');
		expect(obj.message).to.be.equal(`DogePls SourPls ${twitchUsername} You failed to summon rain, with your weak ass rain dance. Check your silo, it is low on CORN! DogePls SourPls`);
	});

	it('should get $blacklist response from invoking execute', async () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/blacklist');
		const event = await mockEvent(`${commander.commandName('$blacklist')} @naivebot`, 'callowcreation', '#callowcreation', '#callowcreation');
		const result = await commander.validateAndExecute(event, command);
		expect(result.success).to.be.not.equal(false);
	});

	it('should send chat message from reward tip', async () => {
		const channel = '#callowcreation';
		const username = 'callowcreation';
		const amount = 10;
		const result = await messenger.handleTipRewards('Subscribing', channel, username, amount);
		expect(result.success).to.be.equal(true);
	});

	it('should send message tyo chat from rewards queue', async () => {

		const channel = '#callowcreation';
		const username = 'callowcreation';
		const amount = 10;
		messenger.enqueueReward('cheer', channel, username, amount);

		const result = await messenger.sendQueuedRewards();

		expect(result.success).to.be.equal(true);
	});

	it('should not send two reward requests with the same message id', async () => {

		const promises = [];

		let userstate = null;
		let methods = null;
		let channel = null;
		let username = null;
		let message = null;
		let streakMonths = null;
		let recipient = null;
		let months = null;

		userstate = {bits: 10, username: 'callowcreation', id: '0932a496-50f2-4020-982d-09102ef36b13'};
		methods = null;
		channel = '#callowcreation';
		username = 'callowcreation';
		promises.push(tmi.onCheer(channel, userstate, message));

		promises.push(tmi.onCheer(channel, userstate, message));

		const results = await Promise.all(promises);

		expect(results[0].error).to.be.equal(null);
		expect(results[1].success).to.be.equal(false);
	});

	it('should handle rewards events', async () => {

		const promises = [];

		let userstate = null;
		let methods = null;
		let channel = null;
		let username = null;
		let message = null;
		let streakMonths = null;
		let recipient = null;
		let months = null;

		userstate = {bits: 10, username: 'callowcreation', id: 'random-id-lol'};
		methods = null;
		channel = '#callowcreation';
		username = 'callowcreation';
		promises.push(tmi.onCheer(channel, userstate, message));

		userstate = {id: 'random-id-kappa'};
		methods = { plan: '1000' };
		channel = 'callowcreation';
		username = 'callowcreation';
		promises.push(tmi.onSubGift(channel, username, streakMonths, recipient, methods, userstate));

		userstate = {id: 'random-id-callowbruh'};
		methods = { plan: '1000' };
		channel = 'callowcreation';
		username = 'callowcreation';
		promises.push(tmi.onSubscription(channel, username, methods, message, userstate));

		userstate = {id: 'random-id-mttv420'};
		methods = { plan: '1000' };
		channel = 'callowcreation';
		username = 'callowcreation';
		promises.push(tmi.onResub(channel, username, months, message, userstate, methods));

		const results = await Promise.all(promises);

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			expect(result.error).to.be.equal(null);
		}
	});

	it('should send sub ticker payout request', async () => {
		
		const auth = require('./settings/auth');

		const MINUTE_AWARD_MULTIPLIER = serverSettings.MINUTE_AWARD_MULTIPLIER;
		let viewers = [];

		const channel = 'markettraderstv';
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
		while(viewers.length > 0) {
			const chunked = viewers.splice(0, 100);
			promises.push(new Promise(async (resolve) => {
				const usernames = chunked.join(',');
				const users = await fetch(`http://localhost:${auth.PORT}/users?usernames=${usernames}`).then(res => res.json());				
				resolve(users.result.users.map(x => x._id));
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
		const results = await databaseAPI.requestPayout(body);

		log(body);

		expect(results).to.be.greaterThan(0);
	});

	it('should perform sub ticker after init', async () => {
		const subTicker = require('./src/sub-ticker');

		const channel = 'callowcreation';

		const initResult = await subTicker.init();
		expect(initResult.success).to.be.equal(true);

		const results = await subTicker.performPayout(channel);

		expect(results).to.be.greaterThan(0);

	});

	it('should send error to database logger', async () => {

		const errorLogger = require('./src/utils/error-logger');

		const error = new Error('Failed test as expected');
		const errorcode = 0;
		const result = await errorLogger.asyncErrorLogger(error, errorcode);
		expect(result).to.be.equal(true);
	});

	it('should be able to get env development variable not in production', () => {		
		const { is_production } = require('./prod');
		expect(is_production).to.be.equal(false);
	});

	it('should envoke a command as test in a development state', async () => {

		const twitchUsername = 'd4rkcide';

		const auth = require('./settings/auth');
		const { id: user_id, login: user_login } = await fetch(`http://localhost:${auth.PORT}/user?username=${twitchUsername}`).then(res => res.json());

		const target = '#callowcreation';
		const user = { 'user-id': user_id, username: user_login };
		const msg = '$raintest 24.999999999999999 10';
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj, obj.message);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('rain');

	});
});