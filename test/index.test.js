"use strict";

const chai = require('chai');
const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const fetch = require('node-fetch');
const _ = require('lodash');
const settingsHelper = require('../_bot-service/settings-helper');
const subTicker = require('../_bot-service/src/sub-ticker');

function log(...value) {
	//console.log(value);
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
	return new Promise(resolve => setTimeout(resolve, ms));
}

describe('#mocha promises', function () {
	const isMock = false;

	this.timeout(20000);
	//let tmi = null;
	//let messenger = null;
	//let databaseAPI = null;

	const tmi = require('../_bot-service/src/tmi');
	const messenger = require('../_bot-service/src/messenger');
	const commander = require('../_bot-service/src/commander');

	const activityTracker = require('../_bot-service/src/activity-tracker');
	const allowedUsers = require('../_api-shared/allowed-users');

	const settingsCache = require('../_settings-service/settings-cache');
	const { getUsers } = require('../_bot-service/src/request-api');

	const databaseAPI = isMock ? {
		request(twitchId, body) {
			return {
				bitcorn: () => Promise.resolve({ status: 500, twitchUsername: 'clayman666' }),
				tipcorn: () => Promise.resolve({ status: 500 }),
				withdraw: () => Promise.resolve({ status: 500 }),
				tipcorn: () => Promise.resolve({ status: 500 })
			}
		},
		makeRequestChannels: () => Promise.resolve({ status: 500 })
	} : require('../_api-shared/database-api');

	let broadcaster;

	async function mockEvent(msg, twitchUsername, channel, irc_target) {

		const { data: [user] } = await getUsers([twitchUsername, channel.replace('#', '')]);

		return {
			channelId: broadcaster ? broadcaster.id : user.id,
			twitchId: user.id,
			twitchUsername: user.login,
			args: commander.messageAsCommand(msg),
			irc_target: irc_target,
			channel: channel
		};
	}

	before(async () => {

		({ data: [broadcaster] } = await getUsers(['callowcreation']));

		messenger.chatQueue.client = tmi.chatClient;
		messenger.whisperQueue.client = tmi.whisperClient;

		activityTracker.init();

		await settingsCache.requestSettings();

		settingsHelper.setItemsObjects(settingsCache.getItems());

		await tmi.connectToChat();

		return tmi.joinChannel('#callowcreation');
	});

	after(() => {
		tmi.chatClient.disconnect();
		tmi.whisperClient.disconnect();
	});

	it('should have connectToChat property', () => {
		expect(tmi).to.be.ownProperty('connectToChat');
	});

	it('should load commands from file system', () => {
		const moduleloader = require('../_bot-service/src/utils/moduleloader');
		const commandsPath = '../commands';
		const commands = moduleloader(commandsPath);
		expect(commands.length).to.be.greaterThan(0);
	});

	it('should commands loaded have all configs', () => {
		const moduleloader = require('../_bot-service/src/utils/moduleloader');
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
		const commands = commander.commands();
		for (let i = 0; i < commands.length; i++) {
			const command = commands[i];

			const target = '#callowcreation';
			const user = { 'room-id': broadcaster.id, 'user-id': '120524051', username: 'naivebot' };
			const msg = command.configs.example;
			const self = false;

			callbackPromises.push(tmi.onMessageHandler(target, user, msg, self).catch(console.log));
		}

		const values = await Promise.all(callbackPromises);

		for (let i = 0; i < values.length; i++) {
			Object.entries(commander.expectedOutProperties).forEach(entry => {
				let key = entry[0];
				expect(Object.keys(values[i])).to.include(key);
			});
		}
	});

	it('should create commands map from commands array', () => {
		const commandsMap = commander.createCommandsMap();
		const commandNames = ['tts', 'bitcorn', 'tipcorn', 'withdraw', 'help', 'rain', 'blacklist'];
		const mapped = commandNames.map(commander.commandName);
		expect(commandsMap).to.have.all.keys(mapped);
	});

	it('should get command and params from chat message', () => {
		const msg = '$tipcorn @naivebot 420';
		const args = commander.messageAsCommand(msg);
		expect(args.params[0]).to.be.equal('@naivebot');
	});

	it('should utility clean params of @ < >', () => {
		const cleanParams = require('../_bot-service/src/utils/clean-params');

		const msg = '$tipcorn <@naivebot> 420';
		const args = commander.messageAsCommand(msg);

		const twitchUsername = cleanParams.at(cleanParams.brackets(args.params[0]));

		expect(twitchUsername).to.be.equal('naivebot');
	});

	it('should confirm params is a number', () => {
		const { amount, isNumber } = require('../_bot-service/src/utils/clean-params');

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
		} : require('../_bot-service/src/commands/bitcorn');

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
		} : require('../_bot-service/src/commands/bitcorn');

		const event = await mockEvent('$bitcorn', 'naivebot', 'callowcreation', '#callowcreation');

		const result = await commander.validateAndExecute(event, command);
		expect(result.success).to.be.not.equal(false);
	});

	// Integration test only ?? !! ??
	it('should execute $bitcorn successfully with message handler', async () => {

		const target = '#callowcreation';
		const user = { 'room-id': broadcaster.id, 'user-id': '120614707', username: 'naivebot' };
		const msg = commander.commandName('$bitcorn');
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self).catch(console.log);
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
			to: `120524051`,
			platform: 'twitch',
			amount: 1,
			columns: ['balance', 'twitchusername']
		};
		const result = await databaseAPI.request(twitchId, body).tipcorn();
		expect(result.status).to.be.equal(500);
	});

	it('should get api response for tipcorn amountOfTipsSent', async () => {
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
			expect(result.from.twitchusername.toLowerCase()).to.be.equal('callowcreation');
		}
	});

	it('should get $tipcorn response from invoking execute', async () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('../_bot-service/src/commands/tipcorn');
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
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };

		const target = '#callowcreation';
		const msg = `${commander.commandName('$tipcorn')} @mattras007 101`;
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self).catch(console.log);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('tipcorn');
	});

	// Integration test only ?? !! ??
	it('should execute $tipcorn insufficient funds with message handler ', async () => {

		const twitchUsername = 'd4rkcide';
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };

		const target = '#callowcreation';
		const msg = `${commander.commandName('$tipcorn')} @mattras007 4200000001`;
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self).catch(console.log);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('tipcorn');
	});

	it('should execute $tipcorn success for unregistered users with message handler', async () => {

		const twitchUsername = 'd4rkcide';
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };

		const target = '#callowcreation';
		const msg = `${commander.commandName('$tipcorn')} @3412q 423`;
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self).catch(console.log);

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
		} : require('../_bot-service/src/commands/withdraw');

		const event = await mockEvent('$withdraw 1 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g', 'callowcreation', 'callowcreation', '#callowcreation');

		const results = await commander.validateAndExecute(event, command);
		expect(results.success).to.be.not.equal(false);
	});

	it('should not invoke disabled command', async () => {

		const type = require('../_bot-service/src/utils/message-type').irc_chat;
		const target = '#callowcreation';

		const twitchUsername = 'd4rkcide';
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };

		const msg = `${commander.commandName('$tts')} corn for all`;
		const self = false;

		const obj = await tmi.asyncOnMessageReceived(type, target, user, msg, self);
		expect(obj.success).to.be.equal(true);
		expect(obj.message).to.be.equal('Command tts is not enabled');
	});

	// Chat message and whisper handler merge into one method
	it('should process whispers and chat messages - chat', async () => {

		const type = require('../_bot-service/src/utils/message-type').irc_chat;
		const target = '#callowcreation';

		const twitchUsername = 'd4rkcide';
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };

		const msg = `${commander.commandName('$tipcorn')} @biteastwood 102`;
		const self = false;

		const obj = await tmi.asyncOnMessageReceived(type, target, user, msg, self);
		expect(obj.success).to.be.equal(true);
	});

	it('should process whispers and chat messages - whisper', async () => {

		const type = require('../_bot-service/src/utils/message-type').irc_whisper;
		const target = '#callowcreation';

		const twitchUsername = 'clayman666';
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };

		const msg = `${commander.commandName('$withdraw')} 1 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g`;
		const self = false;

		const obj = await tmi.asyncOnMessageReceived(type, target, user, msg, self);

		expect(obj.success).to.be.equal(true);
		expect(obj.message).to.be.not.equal(`You failed to withdraw: insufficient funds`);
	});

	/*
		Wallet is down for maintenance
		is the response in test env
	*/
	it('should process withdraw insufficient funds', async () => {

		const type = require('../_bot-service/src/utils/message-type').irc_whisper;
		const target = '#callowcreation';

		const twitchUsername = 'd4rkcide';
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };

		const msg = `${commander.commandName('$withdraw')} 4200000001 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g`;
		const self = false;

		const obj = await tmi.asyncOnMessageReceived(type, target, user, msg, self);

		expect(obj.success).to.be.equal(true);
		//expect(obj.message).to.be.equal(`You failed to withdraw: insufficient funds`);
		expect(obj.message).to.be.equal(`Wallet is down for maintenance`);
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

		const MESSAGE_TYPE = require('../_bot-service/src/utils/message-type');

		let target = 'naivebot';
		let message = 'We can see the thing';
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_whisper, target, message);
		const targetName = messenger.whisperQueue.peek();
		expect(targetName.target).to.be.not.equal(process.env.BOT_USERNAME);
	});

	it('should queue messages to send by MESSAGE_TYPE', () => {

		const MESSAGE_TYPE = require('../_bot-service/src/utils/message-type');

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

		messenger.chatQueue.dequeue();
		messenger.whisperQueue.dequeue();
	});

	it('should confirm messages in chat and whisper queue', () => {

		const MESSAGE_TYPE = require('../_bot-service/src/utils/message-type');

		const target = 'callowcreation';
		const message = 'We can see the thing again';

		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);
		const item = messenger.chatQueue.peek();
		expect(item.message).to.be.equal('We can see the thing again');
		messenger.chatQueue.dequeue();
	});

	it('should send many message from chat queue', async () => {

		const MESSAGE_TYPE = require('../_bot-service/src/utils/message-type');

		let target = '#callowcreation';
		let message = 'should send many message from chat queue ' + Date.now();
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);

		message = 'Seen ' + Date.now();
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);

		await _wait(1000);
		const obj = await messenger.sendQueuedMessagesByType(MESSAGE_TYPE.irc_chat);
		await _wait(1000);
		_error(obj);
		_message(obj);
		expect(obj.success).to.be.equal(true);
	});

	it('should send whisper message from whisper queue', async () => {
		const MESSAGE_TYPE = require('../_bot-service/src/utils/message-type');

		let target = '#callowcreation';
		let message = 'should send whisper message from whisper queue ' + Date.now();
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_whisper, target, message);

		const obj = await messenger.sendQueuedMessagesByType(MESSAGE_TYPE.irc_whisper);
		_error(obj);
		_message(obj);
		expect(obj.success).to.be.equal(true);
	});

	/*it('should invoke tts with message handler', async () => {

		const target = '#callowcreation';
		const user = { 'room-id': broadcaster.id, 'user-id': '120614707', username: 'callowcreation' };
		const msg = `${commander.commandName('$tts')} testing, testing 123`;
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self).catch(console.log);
		expect(obj.success).to.be.equal(true);
		console,log(obj.configs.name);
		expect(obj.configs.name).to.be.equal('tts');
	});*/

	it('should invoke help with message handler', async () => {

		const target = '#callowcreation';
		const user = { 'room-id': broadcaster.id, 'user-id': '120614707', username: 'naivebot' };
		const msg = commander.commandName('$help');
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self).catch(console.log);
		expect(obj.success).to.be.equal(true);
		console, log(obj.configs.name);
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
		} : require('../_bot-service/src/commands/rain');
		const event = await mockEvent('$rain 24.999999999999999 5', 'd4rkcide', '#callowcreation', '#callowcreation');
		const result = await commander.validateAndExecute(event, command);
		log({ event, result });
		expect(result.success).to.be.not.equal(false);
	});

	// Integration test only ?? !! ??
	it('should execute $rain successfully with message handler', async () => {

		const twitchUsername = 'd4rkcide';
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);

		const target = '#callowcreation';
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };
		const msg = `${commander.commandName('$rain')} 24.999999999999999 10`;
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self).catch(console.log);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj, obj.message);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('rain');
	});

	// Integration test only ?? !! ??
	it('should execute $rain insufficient funds with message handler', async () => {

		const twitchUsername = 'd4rkcide';
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);

		const target = '#callowcreation';
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };
		const msg = `${commander.commandName('$rain')} 4200000024.999999999999999 10`;
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self).catch(console.log);

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
		} : require('../_bot-service/src/commands/blacklist');
		const event = await mockEvent(`${commander.commandName('$blacklist')} @naivebot`, 'callowcreation', '#callowcreation', '#callowcreation');
		const result = await commander.validateAndExecute(event, command);
		expect(result.success).to.be.not.equal(false);
	});

	it('should send chat message from reward tip', async () => {
		const REWARD_TYPE = require('../_bot-service/src/utils/reward-type');
		const channel = '#callowcreation';
		const username = 'wollac';
		{
			const bitAmount = 50;
			const result = await messenger.handleTipRewards(REWARD_TYPE.cheer, channel, username, { bitAmount, amount: bitAmount });
			if (result.success === false) {
				expect(result.message).to.be.equal('Tx Tip Event Message Send Disabled');
			} else {
				expect(result.success).to.be.equal(true);
			}
		}
		{
			const result = await messenger.handleTipRewards(REWARD_TYPE.resub, channel, username, tmi.getExtras(channel, '3000'));
			//if(result.)
			if (result.success === false) {
				expect(['Tx Tip Event Message Send Disabled', 'Command failed: 400 Bad Request']).to.be.include(result.message);
			} else {
				expect(result.success).to.be.equal(true);
			}
		}
		{
			const result = await messenger.handleTipRewards(REWARD_TYPE.subgift, channel, username, tmi.getExtras(channel, '1000'));
			if (result.success === false) {
				expect(['Tx Tip Event Message Send Disabled', 'Command failed: 400 Bad Request']).to.be.include(result.message);
			} else {
				expect(result.success).to.be.equal(true);
			}
		}
		{
			const result = await messenger.handleTipRewards(REWARD_TYPE.subscription, channel, username, tmi.getExtras(channel, '2000'));
			if (result.success === false) {
				expect(['Tx Tip Event Message Send Disabled', 'Command failed: 400 Bad Request']).to.be.include(result.message);
			} else {
				expect(result.success).to.be.equal(true);
			}
		}
	});

	it('should send message to chat from rewards queue', async () => {

		const channel = '#callowcreation';
		const username = 'callowcreation';
		const amount = 10;
		messenger.enqueueReward('cheer', channel, username, { bitAmount: amount });

		const result = await messenger.sendQueuedRewards();

		expect(result.success).to.be.equal(true);
	});

	it('should not allow duplicate rewards', async () => {
		const rewardId = '1234567890';
		tmi.duplicateRewardCheck(rewardId);

		expect(tmi.duplicateRewardCheck.bind(tmi, rewardId)).to.throws(`This id is not unique: ${rewardId}`);
	});

	it('should not send two reward requests with the same message id', async () => {

		let userstate = null;
		let methods = null;
		let channel = null;
		let username = null;
		let message = null;

		userstate = { bits: 10, username: 'callowcreation', id: '0932a496-50f2-4020-982d-09102ef36b13' };
		methods = null;
		channel = '#callowcreation';
		username = 'callowcreation';

		const result = await tmi.onCheer(channel, userstate, message);

		expect(result.error).to.be.equal(null);
		expect(tmi.onCheer(channel, userstate, message)).to.eventually.equal(`This id is not unique: ${userstate.id}`);
	});

	it('should handle rewards events', async () => {

		let result = null;
		const promises = [];

		let userstate = null;
		let methods = null;
		let channel = null;
		let username = null;
		let message = null;
		let streakMonths = null;
		let recipient = null;
		let months = null;

		userstate = { bits: 10, username: 'clayman666', id: 'random-id-lol' };
		methods = null;
		channel = '#callowcreation';
		//username = 'callowcreation';
		result = await tmi.onCheer(channel, userstate, message);
		expect(result.error).to.be.equal(null);
		if (result.message !== 'Tx Reward Event Message Send Disabled') {
			expect(result.success).to.be.equal(true);
		}

		userstate = { id: 'random-id-kappa' };
		methods = { plan: '1000' };
		channel = 'callowcreation';
		username = 'callowcreation';
		result = await tmi.onSubGift(channel, username, streakMonths, recipient, methods, userstate);
		expect(result.error).to.be.equal(null);
		if (result.message !== 'Tx Reward Event Message Send Disabled') {
			expect(result.success).to.be.equal(true);
		}

		userstate = { id: 'random-id-callowbruh' };
		methods = { plan: '1000' };
		channel = 'callowcreation';
		username = 'wollac';
		result = await tmi.onSubscription(channel, username, methods, message, userstate);
		expect(result.error).to.be.equal(null);
		if (result.message !== 'Tx Reward Event Message Send Disabled') {
			expect(result.success).to.be.equal(true);
		}

		userstate = { id: 'random-id-mttv420' };
		methods = { plan: '1000' };
		channel = 'callowcreation';
		username = 'd4rkcide';
		result = await tmi.onResub(channel, username, months, message, userstate, methods);
		expect(result.error).to.be.equal(null);
		if (result.message !== 'Tx Reward Event Message Send Disabled') {
			expect(result.success).to.be.equal(true);
		}
	});

	it('should perform sub ticker after init', async () => {
		const subTicker = require('../_bot-service/src/sub-ticker');

		const channel = 'callowcreation';
		const channelId = '75987197';

		const initResult = await subTicker.init();
		expect(initResult.success).to.be.equal(true);

		const results = await subTicker.performPayout({ channel, channelId });

		expect(results).to.be.greaterThan(0);
	});

	it('should envoke a command as test in a development state', async () => {

		const twitchUsername = 'd4rkcide';
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);

		const target = '#callowcreation';
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };
		const msg = '$raintest 24.999999999999999 10';
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self).catch(console.log);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj, obj.message);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('rain');

	});

	it('should make http request to livestreams', async () => {
		const { isNumber } = require('../_bot-service/src/utils/clean-params');

		const results = await databaseAPI.makeRequestChannels();

		const isNum = isNumber(results.length);

		expect(isNum).to.be.equal(true);
		expect(results.length).to.not.be.equal(0);
	});

	it('should populate and join via queue', async () => {

		const roomVisitor = require('../_bot-service/src/room-visitor');

		const { addChannels, getJoinQueue, joinChannelsFromQueue } = await roomVisitor(tmi);

		const queue = getJoinQueue();
		queue.empty();
		addChannels(['callowcreation']);
		expect(queue.size()).to.be.equal(1);

		await joinChannelsFromQueue(tmi);

		expect(queue.size()).to.be.equal(0);

		const result = await joinChannelsFromQueue(tmi);

		expect(result.message).to.be.equal('Empty Queue');
	});

	it('should make livestreams settings request', async () => {

		const { isNumber } = require('../_bot-service/src/utils/clean-params');

		const results = await databaseAPI.makeRequestChannelsSettings();

		const isNum = isNumber(results.length);

		log(results);

		expect(isNum).to.be.equal(true);
		expect(results.length).to.not.be.equal(0);
	});
});

describe('#settings server cache', function () {

	const settingsCache = require('../_settings-service/settings-cache');
	const settingsHelper = require('../_bot-service/settings-helper');

	const activityTracker = require('../_bot-service/src/activity-tracker');

	function mockSettingsCacheResponse(sobj) {
		const items = {
			"minRainAmount": 1.00000000,
			"minTipAmount": 1.00000000,
			"rainAlgorithm": 1,
			"ircTarget": settingsCache.getChannelId('#callowcreation'),
			"txMessages": true,
			"txCooldownPerUser": 0.00000000,
			"enableTransactions": false,

			"ircEventPayments": false,
			"bitcornhubFunded": false,
			"bitcornPerBit": 0.10000000,
			"bitcornPerDonation": 420.00000000,
			"twitchUsername": '#callowcreation'
		};

		for (const key in items) {
			if (sobj.hasOwnProperty(key)) {
				items[key] = sobj[key];
			}
		}
		return items;
	}

	before(async () => {
		await settingsCache.requestSettings();

		settingsHelper.setItemsObjects(settingsCache.getItems());

		activityTracker.init();
	});

	it('should store livestreams settings to cache', async () => {

		const channelId = settingsCache.getChannelId('clayman666'.toLowerCase());

		const items = settingsCache.getItems();
		expect(items).to.be.ownProperty(channelId);

		expect(items[channelId].ircTarget.toLowerCase()).to.be.equal(channelId);
	});

	it('should convert minutes to ms', () => {
		const settingsHelper = require('../_bot-service/settings-helper');

		expect(settingsHelper.convertMinsToMs(1.5)).to.be.equal(90000);
		expect(settingsHelper.convertMinsToMs(0.5)).to.be.equal(30000);
		expect(settingsHelper.convertMinsToMs(0.1)).to.be.equal(6000);
	});

	it('should throw if target or property does not exist', async () => {

		const target = '#callowcreation';

		settingsCache.clear();

		const sitems = mockSettingsCacheResponse({
			"ircTarget": settingsCache.getChannelId(target),
			"txCooldownPerUser": 0.10000000,
			"enableTransactions": false,
			"twitchUsername": target
		});
		settingsCache.setItems([sitems]);
		const item = {
			[settingsCache.getChannelId(target)]: settingsCache.getItem(target)
		};
		settingsHelper.setItemsObjects(item);

		const fakeTarget = 'woLLac';
		const fakeName = 'NotxCooldownPerUser';
		expect(settingsHelper.getProperty.bind(settingsHelper, fakeTarget, fakeName)).to.throws(`Missing settinge channel target ${fakeTarget}`);
		expect(settingsHelper.getProperty.bind(settingsHelper, target, fakeName)).to.throws(`Missing settinge property ${fakeName} for target ${target}`);
	});

	it('should get irc output enabled from settings', async () => {

		const MESSAGE_TYPE = require('../_bot-service/src/utils/message-type');
		const settingsHelper = require('../_bot-service/settings-helper');

		const target = '#callowcreation';

		settingsCache.clear();

		const sitems = mockSettingsCacheResponse({
			"ircTarget": settingsCache.getChannelId(target),
			"txMessages": false
		});
		settingsCache.setItems([sitems]);
		const item = {
			[settingsCache.getChannelId(target)]: settingsCache.getItem(target)
		};
		settingsHelper.setItemsObjects(item);

		let result = settingsHelper.getIrcMessageTarget(target, MESSAGE_TYPE.irc_chat, MESSAGE_TYPE);

		expect(result).to.be.equal(MESSAGE_TYPE.irc_none);

		result = settingsHelper.getIrcMessageTarget(target, MESSAGE_TYPE.irc_whisper, MESSAGE_TYPE);

		expect(result).to.be.equal(MESSAGE_TYPE.irc_whisper);
	});

	it('should user correct $rain algorithm', async () => {

		const settingsHelper = require('../_bot-service/settings-helper');
		const target = '#callowcreation';

		{ // algo 0
			settingsCache.clear();

			const sitems = mockSettingsCacheResponse({
				"ircTarget": settingsCache.getChannelId(target),
				"rainAlgorithm": 0,
				"txMessages": false
			});
			settingsCache.setItems([sitems]);
			const item = {
				[settingsCache.getChannelId(target)]: settingsCache.getItem(target)
			};
			settingsHelper.setItemsObjects(item);

			const activeChatters = activityTracker.getValues();
			const items = activeChatters[target].filter(x => x);

			const result = settingsHelper.getRainAlgorithmResult(target, items);

			const matched = _.isEqual(items, result);
			expect(matched).to.be.equal(true);
		}
		{ // algo 1
			settingsCache.clear();

			const sitems = mockSettingsCacheResponse({
				"ircTarget": settingsCache.getChannelId(target),
				"rainAlgorithm": 1,
				"txMessages": false
			});
			settingsCache.setItems([sitems]);
			const item = {
				[settingsCache.getChannelId(target)]: settingsCache.getItem(target)
			};
			settingsHelper.setItemsObjects(item);

			const activeChatters = activityTracker.getValues();
			const items = activeChatters[target].filter(x => x);

			log(items);

			const result = settingsHelper.getRainAlgorithmResult(target, items);

			const matched = _.isEqual(items, result);
			expect(matched).to.be.equal(false);
		}
	});

	it('should populate channel id map store channel in cache', async () => {

		settingsCache.clear();

		settingsCache.setItems([
			mockSettingsCacheResponse({ "ircTarget": settingsCache.getChannelId('#clayman666') }),
			mockSettingsCacheResponse({ "ircTarget": settingsCache.getChannelId('#callowcreation') })
		]);
		const items = {
			[settingsCache.getChannelId('#clayman666')]: settingsCache.getItem('#clayman666'),
			[settingsCache.getChannelId('#callowcreation')]: settingsCache.getItem('#callowcreation'),
		};
		settingsHelper.setItemsObjects(items);

		const clayman666Id = await settingsCache.getChannelId('#clayman666');
		const callowcreationId = await settingsCache.getChannelId('#callowcreation');

		expect(callowcreationId).to.be.equal('75987197');
		expect(clayman666Id).to.be.equal('120524051');
	});

});