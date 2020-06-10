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
		expect(twitchApi).to.have.ownProperty('getUserId');
	});

	it('should fail with Unauthorized', async () => {
		const client_id = [process.env.HELIX_CLIENT_ID];
		process.env.HELIX_CLIENT_ID = '11223344556677889900';

		const user = await twitchApi.getUserId('naivebot');
		expect(user).to.have.ownProperty('error');
		expect(user.error).to.be.equal('Unauthorized');

		process.env.HELIX_CLIENT_ID = client_id[0];
	});

	it('should get user and have id property', async () => {
		const username = 'naivebot';
		const user = await twitchApi.getUserId(username);

		expect(user).to.have.ownProperty('id');
		expect(Object.keys(user).length).to.be.equal(1);
	});

	it('should get many users and have id properties', async () => {
		const usernames = ['naivebot', 'wollac', 'Blesscards'];
		const users = await twitchApi.getUsersId(usernames);

		console.log(users);

		expect(users.length).to.be.equal(3);

		for (let i = 0; i < users.length; i++) {
			const user = users[i];
			expect(user).to.have.ownProperty('id');
			expect(Object.keys(user).length).to.be.equal(1);
		}
	});

	it('should get user and return developer chosen columns', async () => {
		const username = 'callowcreation';
		const user = await twitchApi.getUserColumns(username, ['id', 'display_name']);
		
		console.log(user);

		expect(user).to.have.ownProperty('id');
		expect(user).to.have.ownProperty('display_name');
		expect(Object.keys(user).length).to.be.equal(2);
	});

	it('should get users and return only developer selected colums', async () => {
		const usernames = ['naivebot', 'wollac', 'Blesscards'];
		const users = await twitchApi.getUsersColumns(usernames, ['id', 'display_name']);

		console.log(users);

		expect(users.length).to.be.equal(3);

		for (let i = 0; i < users.length; i++) {
			const user = users[i];
			expect(user).to.have.ownProperty('id');
			expect(user).to.have.ownProperty('display_name');
			expect(Object.keys(user).length).to.be.equal(2);
		}
	});
});