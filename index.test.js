const chai = require('chai');
const { expect, assert } = chai;
const should = chai.should();
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);


function log(...value) {
	console.log(value);
}

describe('#mocha promises', function () {
	const isMock = true;

	let tmi = null;
	let databaseAPI = null;

	before(() => {
		tmi = require('./src/configs/tmi');

		databaseAPI = isMock ? {
			request(twitchId, body) {
				return {
					bitcorn: () => Promise.resolve({ status: 500, twitchUsername: 'clayman666' }),
					tipcorn: () => Promise.resolve({ status: 500 })
				}
			}
		} : require('./source/config/api-interface/database-api');

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

	it('should have tmi join channel', () => {
		const channel = '#callowcreation';
		return tmi.joinChannel(channel)
			.then(data => {
				expect(data[0]).to.be.equal(channel);
			}).should.eventually.be.fulfilled;
	});

	it('should handle tmi join errors', () => {
		const channel = null;
		return assert.isRejected(tmi.joinChannel(channel));
	});

	it('should handle tmi part errors', () => {
		const channel = -1;
		return assert.isRejected(tmi.partChannel(channel));
	});


	it.skip('should confirm message received from channel', (done) => {
		let timeoutVar = null;
		tmi.chatClient.on('message', (target, user, msg, self) => {
			tmi.onMessageHandler(target, user, msg, self)
				.then(obj => {
					expect(obj.success).to.be.equal(false);
					if (timeoutVar) {
						clearTimeout(timeoutVar);
					}
					done();
				});
		});
		timeoutVar = setTimeout(() => {
			tmi.chatClient.say('#callowcreation', 'Terra applicant');
		}, 1000);
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

	it('should have out properties on commands', () => {
		const callbackPromises = [];

		for (let i = 0; i < tmi.commands.length; i++) {
			const command = tmi.commands[i];

			const target = '#callowcreation';
			const user = { 'user-id': '120524051', username: 'naivebot' };
			const msg = command.configs.example;
			const self = false;

			callbackPromises.push(tmi.onMessageHandler(target, user, msg, self));
		}

		return Promise.all(callbackPromises)
			.then(values => {
				for (let i = 0; i < values.length; i++) {
					for (const key in tmi.expectedOutProperties) {
						expect(Object.keys(values[i])).to.include(key);
					}
				}
			}).should.eventually.be.fulfilled;
	});

	it('should tmi has commands', () => {
		expect(tmi.commands.map(x => x.configs.name)).to.include('bitcorn');
	});

	it('should create commands map from commands array', () => {
		const commands = tmi.commands;
		const commandsMap = tmi.createCommandsMap(commands);
		expect(commandsMap).to.have.all.keys('bitcorn', 'tipcorn', 'withdraw');
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

	it('should twitchId pass cooldown time', (done) => {
		const configs = {
			name: 'bitcorn',
			cooldown: 1000 * 1,
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

		setTimeout(() => {
			const passed = tmi.checkCooldown(configs, twitchId, cooldowns);
			expect(passed).to.be.equal(true);
			done();
		}, +configs.cooldown + 500);

	});

	it('should channel name cause global cooldown block', (done) => {
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

		setTimeout(() => {
			let passed = true;

			// assign 'passed' on first request and it passes
			// because global cooldown has just started
			passed = tmi.checkCooldown(configs, channelName, global_cooldown);

			// assign 'passed' on second request and it fails 
			// because global cooldown was not reached
			tmi.checkCooldown(configs, channelName, global_cooldown);

			expect(passed).to.be.equal(true);
			done();
		}, +configs.cooldown + 500);


	});

	it('should have all event parameters to execute command', () => {
		const event = {
			args: [],
			twitchId: '120524051',
			irc_target: 'callowcreation',
			channel: '#callowcreation'
		};
		expect(tmi.validatedEventParameters(event)).to.be.equal(true);
	});

	/*
	$bitcorn tests
	*/
	it('should get api response for bitcorn status 500', () => {
		const twitchId = '123';
		const body = null;
		return databaseAPI.request(twitchId, body).bitcorn()
			.then(result => {
				expect(result.status).to.be.equal(500);
			});
	});

	it('should get api response for bitcorn twitchUsername:', () => {
		const twitchId = '120524051';
		const body = null;
		return databaseAPI.request(twitchId, body).bitcorn()
			.then(result => {
				expect(result).to.be.ownProperty('twitchUsername');
			});
	});

	it('should get api response for bitcorn username to be clayman666', () => {
		const twitchId = '120524051';
		const body = null;
		return databaseAPI.request(twitchId, body).bitcorn()
			.then(result => {
				expect(result.twitchUsername).to.be.equal('clayman666');
			});
	});

	it('should get $bitcorn response from invoking execute', () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/bitcorn');
		const event = { twitchId: '120524051' };
		return command.execute(event)
			.then(result => {
				expect(result.success).to.be.not.equal(false);
			});
	});

	// Integration test only ?? !! ??
	it.skip('should execute $bitcorn successfully with message handler', () => {

		const target = '#callowcreation';
		const user = { 'user-id': '120614707', username: 'naivebot' };
		const msg = '$bitcorn';
		const self = false;

		return tmi.onMessageHandler(target, user, msg, self)
			.then(obj => {
				expect(obj.success).to.be.equal(true);
				expect(obj.configs.name).to.be.equal('bitcorn');
			});
	});


	/*
	$tipcorn tests
	*/
	it('should get api response for tipcorn status 500', () => {
		const twitchId = '75987197';
		const body = {
			from: `${twitchId}`,
			to: `twitch|120524051`,
			platform: 'twitch',
			amount: 1,
			columns: ['balance', 'tipped']
		};
		return databaseAPI.request(twitchId, body).tipcorn()
			.then(result => {
				expect(result.status).to.be.equal(500);
			});
	});

	it('should get api response for tipcorn tipped:', () => {
		const twitchId = '75987197';
		const body = {
			from: `twitch|75987197`,
			to: `twitch|120524051`,
			platform: 'twitch',
			amount: 1,
			columns: ['balance', 'tipped']
		};
		return databaseAPI.request(twitchId, body).tipcorn()
			.then(results => {
				for (let i = 0; i < results.length; i++) {
					const result = results[i];
					expect(result.from).to.be.ownProperty('tipped');
					expect(result.to).to.be.ownProperty('tipped');
				}
			});
	});

	it.skip('should get api response for tipcorn username to be callowcreation', () => {
		const twitchId = '75987197';
		const body = {
			from: `twitch75987197`,
			to: `twitch|120524051`,
			platform: 'twitch',
			amount: 1,
			columns: ['balance', 'twitchusername']
		};
		return databaseAPI.request(twitchId, body).tipcorn()
			.should.be.fulfilled
			.then(results => {
				expect(results.from.twitchusername).to.be.equal('callowcreation');
			});
	});

	it.skip('should get $tipcorn response from invoking execute', (done) => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/tipcorn');
		const event = { twitchId: '75987197', args: { name: 'tipcorn', prefix: '$', params: ['naivebot', 10] } };
		command.execute(event)
			.then(results => {
				if (results.success === false) {
					const result = results[i];
					if (result.success === false) {
						log('tipcorn Output =>>>>>>>>>> ', result);
					}
					expect(result.success).to.be.equal(true);
					done();
				}
			});
	});

	// Integration test only ?? !! ??
	it.skip('should execute $tipcorn successfully with message handler', (done) => {

		setTimeout(() => {
			const target = '#callowcreation';
			const user = { 'user-id': '120524051', username: 'naivebot' };
			const msg = '$tipcorn @naivebot 1';
			const self = false;

			tmi.onMessageHandler(target, user, msg, self)
				.then(obj => {

					if (obj.success === false) {
						log('Command Output =>>>>>>>>>> ', obj);
					}

					expect(obj.success).to.be.equal(true);
					expect(obj.configs.name).to.be.equal('tipcorn');
					done();
				}).catch(e => e);
		}, 100);
	});


	it('should get $withdraw response from invoking execute', () => {
		const command = isMock ? {
			execute(event) {
				return Promise.resolve({ success: true });
			}
		} : require('./src/commands/withdraw');
		const event = { twitchId: '75987197', args: { name: 'withdraw', prefix: '$', params: [1, 'CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g'] } };
		return command.execute(event)
			.then(results => {
				log('withdraw Output =------------> ', results);
				expect(results.success).to.be.not.equal(false);
			});
	});

	// Chat message and whisper handler merge into one method
	it.skip('should process whispers and chat messages - chat', () => {
		return new Promise(resolve => {

			const type = require('./src/utils/message-type').irc_chat;
			const target = '#callowcreation';
			const user = { 'user-id': '120524051', username: 'naivebot' };
			const msg = '$tipcorn @callowcreation 1';
			const self = false;

			setTimeout(() => {
				tmi.asyncOnMessageReceived(type, target, user, msg, self)
					.then(obj => {
						expect(obj.success).to.be.equal(true);
						resolve();
					}).catch(e => e);
			}, 50);
		});
	});

	it.skip('should process whispers and chat messages - whisper', (done) => {

		const type = require('./src/utils/message-type').irc_whisper;
		const target = '#callowcreation';
		const user = { 'user-id': '120524051', username: 'naivebot' };
		const msg = '$withdraw 1 CJWKXJGS3ESpMefAA83i6rmpX6tTAhvG9g';
		const self = false;

		setTimeout(() => {
			tmi.asyncOnMessageReceived(type, target, user, msg, self)
				.then(obj => {
					expect(obj.success).to.be.equal(true);
					done();
				}).catch(e => e);
		}, 50);
	});


	// chat and whisper queue
	it('should add items to chat queue', () => {
		tmi.chatQueue.enqueue({ test_item: 'No name' });
		expect(tmi.chatQueue.size()).to.be.equal(1);
	});

	it('should remove items from chat queue', () => {
		tmi.chatQueue.dequeue();
		expect(tmi.chatQueue.size()).to.be.equal(0);
	});

	it('should not enqueue MESSAGE_TYPE whisper self', () => {

		const MESSAGE_TYPE = require('./src/utils/message-type');
		const auth = require('./settings/auth');

		let target = auth.data.BOT_USERNAME;
		let message = 'We can see the thing';
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_whisper, target, message);
		const targetName = tmi.whisperQueue.peek();

		expect(targetName.target).to.be.not.equal(target);
	});

	it('should queue messages to send by MESSAGE_TYPE', () => {

		const MESSAGE_TYPE = require('./src/utils/message-type');

		while(tmi.whisperQueue.size() > 0) tmi.whisperQueue.dequeue();
		while(tmi.chatQueue.size() > 0) tmi.chatQueue.dequeue();

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

	it.skip('should send chat message from queue', () => {
		const MESSAGE_TYPE = require('./src/utils/message-type');

		let target = '#callowcreation';
		let message = 'should send chat message from queue ' + Date.now();
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);

		return tmi.joinChannel(target)
			.then(() => {
				return tmi.sendQueuedChatMessages()
					.then(obj => {
						expect(obj.success).to.be.equal(true);
					}).should.eventually.be.fulfilled
			});
	});

	it('should send many message from chat queue', () => {
		const MESSAGE_TYPE = require('./src/utils/message-type');

		let target = '#callowcreation';
		let message = 'should send many message from chat queue ' + Date.now();
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);

		message = 'Seen ' + Date.now();
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);

		return tmi.joinChannel(target)
			.then(() => {
				return tmi.sendQueuedChatMessages()
					.then(obj => {
						expect(obj.success).to.be.equal(true);
					}).should.eventually.be.fulfilled;
			});
	});

	it('should send whisper message from whisper queue', () => {
		const MESSAGE_TYPE = require('./src/utils/message-type');

		let target = '#callowcreation';
		let message = 'should send whisper message from whisper queue ' + Date.now();
		tmi.enqueueMessageByType(MESSAGE_TYPE.irc_whisper, target, message);

		return tmi.sendQueuedWhisperMessages()
			.then(obj => {
				expect(obj.success).to.be.equal(true);
			}).should.eventually.be.fulfilled
	});
});