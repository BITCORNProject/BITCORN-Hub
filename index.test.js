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
					bitcorn: () => Promise.resolve({ status: 500, twitchUsername: 'clayman666' })
				}
			}
		} : require('./source/config/api-interface/database-api');

		return tmi.connectToChat();
	});

	after(() => {
		return tmi.chatClient.disconnect();
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
			});
	});

	it('should handle tmi join errors', () => {
		const channel = null;
		return assert.isRejected(tmi.joinChannel(channel));
	});

	it('should handle tmi part errors', () => {
		const channel = -1;
		return assert.isRejected(tmi.partChannel(channel));
	});

	it('should confirm message received from channel', (done) => {
		tmi.chatClient.on('message', (target, user, msg, self) => {
			tmi.onMessageHandler(target, user, msg, self)
				.then(obj => {
					expect(obj.success).to.be.equal(false);
					expect(obj.msg).to.be.equal('Terra applicant');
					done();
				});
		});
		setTimeout(() => {
			tmi.chatClient.say('#callowcreation', 'Terra applicant');
		}, 1000);
	});



	it('should get api response for bitcorn status 500', () => {
		const twitchId = '123';
		return databaseAPI.request(twitchId, null).bitcorn()
			.then(result => {
				expect(result.status).to.be.equal(500);
			});
	});

	it('should get api response for bitcorn twitchUsername:', () => {
		const twitchId = '120524051';
		return databaseAPI.request(twitchId, null).bitcorn()
			.then(result => {
				expect(result).to.be.ownProperty('twitchUsername');
			});
	});

	it('should get api response for bitcorn username to be clayman666', () => {
		const twitchId = '120524051';
		return databaseAPI.request(twitchId, null).bitcorn()
			.then(result => {
				expect(result.twitchUsername).to.be.equal('clayman666');
			});
	});

	it('should get !bitcorn response', () => {
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

	it('should load commands from file system', () => {
		const moduleloader = require('./src/utils/moduleloader');
		const commandsPath = '../commands';
		const commands = moduleloader(commandsPath);
		expect(commands.map(x => x.configs.name)).to.include('bitcorn');
	});

	it('should tmi has commands', () => {
		expect(tmi.commands.map(x => x.configs.name)).to.include('bitcorn');
	});

	it('should create commands map from commands array', () => {
		const commands = tmi.commands;
		const commandsMap = tmi.createCommandsMap(commands);
		expect(commandsMap).to.have.all.keys('bitcorn');
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

	it('should twitchId pass global cooldown time', (done) => {
		const configs = {
			name: 'bitcorn',
			cooldown: 1000 * 1,
			global_cooldown: true,
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

	// Integration test only ?? !! ??
	/*it('should execute $bitcorn successfully', () => {

		const target = '#callowcreation';
		const user = { 'user-id': '120524051' };
		const msg = '$bitcorn';
		const self = false;

		return tmi.onMessageHandler(target, user, msg, self)
			.then(obj => {
				expect(obj.success).to.be.equal(true);
			});
	});*/
});