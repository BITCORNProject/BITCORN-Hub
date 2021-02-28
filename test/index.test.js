"use strict";

const chai = require('chai');
const { expect, assert } = chai;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const fetch = require('node-fetch');
const _ = require('lodash');

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

describe.skip('#mocha promises', function () {
	const isMock = false;

	this.timeout(20000);
	//let tmi = null;
	//let messenger = null;
	//let databaseAPI = null;

	const tmi = require('../_bot/src/tmi');
	const messenger = require('../_bot/src/messenger');
	const commander = require('../_bot/src/commander');

	const activityTracker = require('../_bot/src/activity-tracker');
	const allowedUsers = require('../_bot/src/utils/allowed-users');

	const serverSettings = require('../settings/server-settings.json');

	const settingsCache = require('../_api-service/settings-cache');
	const { getUsers, getChatters } = require('../_api-service/request-api');

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
	} : require('../_api-service/database-api');

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
		const moduleloader = require('../_bot/src/utils/moduleloader');
		const commandsPath = '../commands';
		const commands = moduleloader(commandsPath);
		expect(commands.length).to.be.greaterThan(0);
	});

	it('should commands loaded have all configs', () => {
		const moduleloader = require('../_bot/src/utils/moduleloader');
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
		expect(commander.commands().map(x => x.configs.name)).to.include('bitcorn');
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
		const cleanParams = require('../_bot/src/utils/clean-params');

		const msg = '$tipcorn <@naivebot> 420';
		const args = commander.messageAsCommand(msg);

		const twitchUsername = cleanParams.at(cleanParams.brackets(args.params[0]));

		expect(twitchUsername).to.be.equal('naivebot');
	});

	it('should confirm params is a number', () => {
		const { amount, isNumber } = require('../_bot/src/utils/clean-params');

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
		} : require('../_bot/src/commands/bitcorn');

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
		} : require('../_bot/src/commands/bitcorn');

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
			to: `120524051`,
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
			expect(result.from.twitchusername.toLowerCase()).to.be.equal('callowcreation');
		}
	});

	it('should get $tipcorn response from invoking execute', async () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('../_bot/src/commands/tipcorn');
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
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };

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
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };

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
		} : require('../_bot/src/commands/withdraw');

		const event = await mockEvent('$withdraw 1 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g', 'callowcreation', 'callowcreation', '#callowcreation');

		const results = await commander.validateAndExecute(event, command);
		expect(results.success).to.be.not.equal(false);
	});

	// Chat message and whisper handler merge into one method
	it('should process whispers and chat messages - chat', async () => {
		await _wait(50);

		const type = require('../_bot/src/utils/message-type').irc_chat;
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

		await _wait(50);

		const type = require('../_bot/src/utils/message-type').irc_whisper;
		const target = '#callowcreation';

		const twitchUsername = 'callowcreation';
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

		await _wait(50);

		const type = require('../_bot/src/utils/message-type').irc_whisper;
		const target = '#callowcreation';

		const twitchUsername = 'callowcreation';
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

		const MESSAGE_TYPE = require('../_bot/src/utils/message-type');

		let target = 'naivebot';
		let message = 'We can see the thing';
		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_whisper, target, message);
		const targetName = messenger.whisperQueue.peek();
		expect(targetName.target).to.be.not.equal(process.env.BOT_USERNAME);
	});

	it('should queue messages to send by MESSAGE_TYPE', () => {

		const MESSAGE_TYPE = require('../_bot/src/utils/message-type');

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

		const MESSAGE_TYPE = require('../_bot/src/utils/message-type');

		const target = 'callowcreation';
		const message = 'We can see the thing again';

		messenger.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);
		const item = messenger.chatQueue.peek();
		expect(item.message).to.be.equal('We can see the thing again');
		messenger.chatQueue.dequeue();
	});

	it('should send many message from chat queue', async () => {

		await _wait(500);

		const MESSAGE_TYPE = require('../_bot/src/utils/message-type');

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
		const MESSAGE_TYPE = require('../_bot/src/utils/message-type');

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
		const user = { 'room-id': broadcaster.id, 'user-id': '120614707', username: 'naivebot' };
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
		await _wait(1000);
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('../_bot/src/commands/rain');
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
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);

		const target = '#callowcreation';
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };
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
		} : require('../_bot/src/commands/blacklist');
		const event = await mockEvent(`${commander.commandName('$blacklist')} @naivebot`, 'callowcreation', '#callowcreation', '#callowcreation');
		const result = await commander.validateAndExecute(event, command);
		expect(result.success).to.be.not.equal(false);
	});

	it('should send chat message from reward tip', async () => {
		const channel = '#callowcreation';
		const username = 'wollac';
		const amount = 50;
		const result = await messenger.handleTipRewards('Subscribing', channel, username, amount);
		if(result.success === false) {
			expect(result.message).to.be.equal('Tx Tip Event Message Send Disabled');
		} else {
			expect(result.success).to.be.equal(true);
		}
	});

	it('should send message tyo chat from rewards queue', async () => {

		const channel = '#callowcreation';
		const username = 'callowcreation';
		const amount = 10;
		messenger.enqueueReward('cheer', channel, username, amount);

		const result = await messenger.sendQueuedRewards();

		expect(result.success).to.be.equal(true);
	});

	it('should not allow duplicate rewards', async () => {
		const rewardId = '1234567890';
		tmi.duplicateRewardCheck(rewardId);
		const result = tmi.duplicateRewardCheck(rewardId);
		expect(result).to.be.equal(true);
	});

	it('should not give reward got no-reward channels', async () => {
		const channel = 'naivebot';

		const result = tmi.noRewardCheck(channel);
		expect(result).to.be.equal(true);

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

		userstate = { bits: 10, username: 'callowcreation', id: '0932a496-50f2-4020-982d-09102ef36b13' };
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

		userstate = { bits: 10, username: 'callowcreation', id: 'random-id-lol' };
		methods = null;
		channel = '#callowcreation';
		username = 'callowcreation';
		result = await tmi.onCheer(channel, userstate, message);
		expect(result.error).to.be.equal(null);
		if (result.message !== 'Tx Reward Event Message Send Disabled') {
			expect(result.success).to.be.equal(true);
		}
		await _wait(100);

		userstate = { id: 'random-id-kappa' };
		methods = { plan: '1000' };
		channel = 'callowcreation';
		username = 'callowcreation';
		result = await tmi.onSubGift(channel, username, streakMonths, recipient, methods, userstate);
		expect(result.error).to.be.equal(null);
		if (result.message !== 'Tx Reward Event Message Send Disabled') {
			expect(result.success).to.be.equal(true);
		}
		await _wait(100);

		userstate = { id: 'random-id-callowbruh' };
		methods = { plan: '1000' };
		channel = 'callowcreation';
		username = 'callowcreation';
		result = await tmi.onSubscription(channel, username, methods, message, userstate);
		expect(result.error).to.be.equal(null);
		if (result.message !== 'Tx Reward Event Message Send Disabled') {
			expect(result.success).to.be.equal(true);
		}
		await _wait(100);

		userstate = { id: 'random-id-mttv420' };
		methods = { plan: '1000' };
		channel = 'callowcreation';
		username = 'callowcreation';
		result = await tmi.onResub(channel, username, months, message, userstate, methods);
		expect(result.error).to.be.equal(null);
		if (result.message !== 'Tx Reward Event Message Send Disabled') {
			expect(result.success).to.be.equal(true);
		}
	});

	it.skip('should send sub ticker payout request', async () => {

		const MINUTE_AWARD_MULTIPLIER = serverSettings.MINUTE_AWARD_MULTIPLIER;
		let viewers = [];

		const channel = 'callowcreation';
		const { chatters: chatters_json } = await getChatters(channel);
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
			const usernames = viewers.splice(0, 100);
			promises.push(new Promise(async (resolve) => {
				const { data } = await getUsers(usernames);
				resolve(data.map(x => x.id));
			}));
		}
		const presults = await Promise.all(promises);
		chatters = [].concat.apply([], presults);

		//log(chatters.length);
		//chatters.length = 5;

		//log(chatters);

		const { data: [{ id: senderId }] } = await getUsers([channel]);
		const body = {
			ircTarget: senderId,
			chatters: chatters,
			minutes: MINUTE_AWARD_MULTIPLIER,
		};

		log(`---------------> ${senderId}`);

		const results = await databaseAPI.requestPayout(body);

		log(body, { results });

		expect(results).to.be.greaterThan(0);
	});

	it.skip('should perform sub ticker after init', async () => {
		const subTicker = require('../_bot/src/sub-ticker');

		const channel = 'callowcreation';

		const initResult = await subTicker.init();
		expect(initResult.success).to.be.equal(true);

		const results = await subTicker.performPayout(channel);

		expect(results).to.be.greaterThan(0);
	});

	it('should send error to database logger', async () => {

		const errorLogger = require('../_bot/src/utils/error-logger');

		const error = new Error('Failed test as expected');
		const errorcode = 0;
		const result = await errorLogger.asyncErrorLogger(error, errorcode);
		expect(result).to.be.equal(true);
	});

	it('should be able to get env development variable not in production', () => {
		const { is_production } = require('../prod');
		expect(is_production).to.be.equal(false);
	});

	it('should envoke a command as test in a development state', async () => {

		const twitchUsername = 'd4rkcide';
		const { data: [{ id: user_id, login: user_login }] } = await getUsers([twitchUsername]);

		const target = '#callowcreation';
		const user = { 'room-id': broadcaster.id, 'user-id': user_id, username: user_login };
		const msg = '$raintest 24.999999999999999 10';
		const self = false;

		const obj = await tmi.onMessageHandler(target, user, msg, self);

		if (obj.success === false) {
			log('Command Output =>>>>>>>>>> ', obj, obj.message);
		}

		expect(obj.success).to.be.equal(true);
		expect(obj.configs.name).to.be.equal('rain');

	});

	it('should make http request to livestreams', async () => {
		const { isNumber } = require('../_bot/src/utils/clean-params');

		const results = await databaseAPI.makeRequestChannels();

		const isNum = isNumber(results.length);

		expect(isNum).to.be.equal(true);
		expect(results.length).to.not.be.equal(0);
	});

	it('should populate and join via queue', async () => {

		const roomVisitor = require('../_bot/src/room-visitor');

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

		const { isNumber } = require('../_bot/src/utils/clean-params');

		const results = await databaseAPI.makeRequestChannelsSettings();

		const isNum = isNumber(results.length);

		log(results);

		expect(isNum).to.be.equal(true);
		expect(results.length).to.not.be.equal(0);
	});
});

describe('#mocha promises', function () {

	const settingsCache = require('../_api-service/settings-cache');
	const settingsHelper = require('../_api-service/settings-helper');

	const serverSettings = require('../settings/server-settings.json');

	const activityTracker = require('../_bot/src/activity-tracker');

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
			"bitcornPerDonation": 420.00000000
		};

		for (const key in items) {
			if (sobj.hasOwnProperty(key)) {
				items[key] = sobj[key];
			}
		}
		return items;
	}

	before(async () => {

		activityTracker.init();

		return settingsCache.requestSettings();
	});

	it('should store livestreams settings to cache', async () => {

		const channelId = settingsCache.getChannelId('clayman666'.toLowerCase());

		const items = settingsCache.getItems();
		expect(items).to.be.ownProperty(channelId);

		expect(items[channelId].ircTarget.toLowerCase()).to.be.equal(channelId);
	});

	it('should clear settings cache', async () => {

		const channel = 'clayman666'.toLowerCase();

		const sitems = mockSettingsCacheResponse({
			"ircTarget": settingsCache.getChannelId(`#${channel}`)
		});
		settingsCache.setItems([sitems]);

		// const results = await databaseAPI.makeRequestChannelsSettings();
		// settingsCache.setItems(results);

		let items = settingsCache.getItems();
		expect(items).to.be.ownProperty(settingsCache.getChannelId(channel));

		settingsCache.clear();
		items = settingsCache.getItems();
		expect(items).to.be.not.ownProperty(settingsCache.getChannelId(channel));
		expect(Object.keys(items).length).to.be.equal(0);

	});

	it('should get a specific livestreams channel settings from cache', async () => {

		const channel = 'callowcreation';
		settingsCache.clear();

		let item = settingsCache.getItem(channel);

		expect(item).to.be.equal(undefined);

		const sitems = mockSettingsCacheResponse({
			"ircTarget": settingsCache.getChannelId(`#${channel}`)
		});
		settingsCache.setItems([sitems]);

		item = settingsCache.getItem(channel);

		expect(item).to.be.ownProperty('ircTarget');

		expect(item.ircTarget).to.be.equal(settingsCache.getChannelId(`#${channel}`));
	});

	it('should early out with channel enable transaction is false', async () => {

		settingsCache.clear();

		const target = '#callowcreation';

		const sitems = mockSettingsCacheResponse({
			"ircTarget": settingsCache.getChannelId(target),
			"enableTransactions": false
		});
		settingsCache.setItems([sitems]);
	
		expect(settingsHelper.transactionsDisabled(target)).to.be.equal(true);
	});

	it('should convert minutes to ms', () => {
		const settingsHelper = require('../_api-service/settings-helper');

		expect(settingsHelper.convertMinsToMs(1.5)).to.be.equal(90000);
		expect(settingsHelper.convertMinsToMs(0.5)).to.be.equal(30000);
		expect(settingsHelper.convertMinsToMs(0.1)).to.be.equal(6000);
	});

	it('should get channel cooldown or set a default value', async () => {

		const target = '#callowcreation';

		settingsCache.clear();

		const sitems = mockSettingsCacheResponse({
			"ircTarget": settingsCache.getChannelId(target),
			"txCooldownPerUser": 0.10000000,
			"enableTransactions": false
		});
		settingsCache.setItems([sitems]);

		const result = settingsHelper.getChannelCooldown(target, 20);

		expect(result).to.be.equal(6000);
	});

	it('should get irc output enabled from settings', async () => {

		const MESSAGE_TYPE = require('../_bot/src/utils/message-type');
		const settingsHelper = require('../_api-service/settings-helper');

		const target = '#callowcreation';

		settingsCache.clear();

		const sitems = mockSettingsCacheResponse({
			"ircTarget": settingsCache.getChannelId(target),
			"txMessages": false
		});
		settingsCache.setItems([sitems]);

		let result = settingsHelper.getIrcMessageTarget(target, MESSAGE_TYPE.irc_chat, MESSAGE_TYPE);

		expect(result).to.be.equal(MESSAGE_TYPE.irc_none);

		result = settingsHelper.getIrcMessageTarget(target, MESSAGE_TYPE.irc_whisper, MESSAGE_TYPE);

		expect(result).to.be.equal(MESSAGE_TYPE.irc_whisper);
	});

	it('should user correct $rain algorithm', async () => {

		const settingsHelper = require('../_api-service/settings-helper');
		const target = '#callowcreation';

		{ // algo 0
			settingsCache.clear();

			const sitems = mockSettingsCacheResponse({
				"ircTarget": settingsCache.getChannelId(target),
				"rainAlgorithm": 0,
				"txMessages": false
			});
			settingsCache.setItems([sitems]);

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

			const activeChatters = activityTracker.getValues();
			const items = activeChatters[target].filter(x => x);

			log(items);

			const result = settingsHelper.getRainAlgorithmResult(target, items);

			const matched = _.isEqual(items, result);
			expect(matched).to.be.equal(false);
		}
	});

	it('should get tipcorn min amount from settings helper', async () => {

		const settingsHelper = require('../_api-service/settings-helper');
		const target = '#callowcreation';
		const minTipAmount = 16.55;

		settingsCache.clear();

		const sitems = mockSettingsCacheResponse({
			"minTipAmount": minTipAmount,
			"ircTarget": settingsCache.getChannelId(target)
		});
		settingsCache.setItems([sitems]);

		const result = settingsHelper.getTipcornMinAmount(target, serverSettings.MIN_TIPCORN_AMOUNT);

		expect(result).to.be.equal(minTipAmount);
	});

	it('should get rain min amount from settings helper', async () => {

		const settingsHelper = require('../_api-service/settings-helper');
		const target = '#callowcreation';
		const minRainAmount = 5.55555;

		settingsCache.clear();

		const sitems = mockSettingsCacheResponse({
			"minRainAmount": minRainAmount,
			"ircTarget": settingsCache.getChannelId(target)
		});
		settingsCache.setItems([sitems]);

		const result = settingsHelper.getRainMinAmount(target, serverSettings.MIN_RAIN_AMOUNT);

		expect(result).to.be.equal(minRainAmount);
	});


	it('should get irc event payments from settings helper', async () => {

		const settingsHelper = require('../_api-service/settings-helper');
		const target = '#callowcreation';

		settingsCache.clear();

		const sitems = mockSettingsCacheResponse({
			"ircEventPayments": true
		});
		settingsCache.setItems([sitems]);

		const result = settingsHelper.getIrcEventPayments(target, false);

		expect(result).to.be.equal(true);
	});

	it('should get bitcornhub funded from settings helper', async () => {

		const settingsHelper = require('../_api-service/settings-helper');
		const target = '#callowcreation';

		settingsCache.clear();

		const sitems = mockSettingsCacheResponse({
			"bitcornhubFunded": true
		});
		settingsCache.setItems([sitems]);

		const result = settingsHelper.getBitcornhubFunded(target, false);

		expect(result).to.be.equal(true);
	});

	it('should get bitcorn per bit from settings helper', async () => {

		const settingsHelper = require('../_api-service/settings-helper');
		const target = '#callowcreation';
		const bitcornPerBit = 6.66;

		settingsCache.clear();

		const sitems = mockSettingsCacheResponse({
			"bitcornPerBit": bitcornPerBit
		});
		settingsCache.setItems([sitems]);

		const result = settingsHelper.getBitcornPerBit(target, 1.000000);

		expect(result).to.be.equal(bitcornPerBit);
	});

	it('should get bitcorn per donation from settings helper', async () => {

		const settingsHelper = require('../_api-service/settings-helper');
		const target = '#clayman666';
		const bitcornPerDonation = 4.20;

		settingsCache.clear();

		const sitems = mockSettingsCacheResponse({
			"ircTarget": settingsCache.getChannelId(target),
			"bitcornPerDonation": bitcornPerDonation
		});
		settingsCache.setItems([sitems]);

		const result = settingsHelper.getBitcornPerDonation(target, 4.000000);

		expect(result).to.be.equal(bitcornPerDonation);
	});

	it('should populate channel id map store channel in cache', async () => {

		settingsCache.clear();

		settingsCache.setItems([
			mockSettingsCacheResponse({ "ircTarget": settingsCache.getChannelId('#clayman666') }),
			mockSettingsCacheResponse({ "ircTarget": settingsCache.getChannelId('#callowcreation') })
		]);

		const clayman666Id = await settingsCache.getChannelId('#clayman666');
		const callowcreationId = await settingsCache.getChannelId('#callowcreation');

		expect(callowcreationId).to.be.equal('75987197');
		expect(clayman666Id).to.be.equal('120524051');
	});

	it('should set channel id(s) to settings cache', async () => {
		settingsCache.clear();

		settingsCache.setItems([
			mockSettingsCacheResponse({ "ircTarget": settingsCache.getChannelId('#clayman666') })
		]);

		const target = '#callowcreation';
		settingsCache.setItems([
			mockSettingsCacheResponse({ "ircTarget": settingsCache.getChannelId(target) })
		]);

		await settingsCache.setChannelsIds([target]);

		const clayman666Id = await settingsCache.getChannelId('#clayman666');
		const callowcreationId = await settingsCache.getChannelId('#callowcreation');
		const nonameId = await settingsCache.getChannelId('#no-name');

		expect(callowcreationId).to.be.equal('75987197');
		expect(clayman666Id).to.be.equal('120524051');
		expect(nonameId).to.be.equal(undefined);

	});
});