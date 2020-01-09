const chai = require('chai');
const { expect, assert } = chai;
const should = chai.should();
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);


function log(...value) {
	console.log(value);
}

describe('#mocha promises', function () {

	let tmi = null;

	before(() => {
		tmi = require('./src/configs/tmi');
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
					expect(obj.success).to.be.equal(true);
					expect(obj.msg).to.be.equal('!say y u no follow');
					done();
				});
		});
		setTimeout(() => {
			tmi.chatClient.say('#callowcreation', '!say y u no follow');
		}, 1000);
	});
});