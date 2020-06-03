"use strict";

const chai = require('chai');
const { expect, assert } = chai;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

describe('#twitch api routes', function () {

	const twitchApi = require('../src/api-interface/twitch-api');

	before(() => {
		return null;
	});

	after(() => {
		return null;
	});

	it('should have getUser property method', () => {
		expect(twitchApi).to.have.ownProperty('getUser');
	});

	it('should get user and have id property', async () => {
		const username = 'naivebot';
		const user = await twitchApi.getUser(username);
		expect(user).to.have.ownProperty('id');
		expect(Object.keys(user).length).to.be.equal(1);
	});
});