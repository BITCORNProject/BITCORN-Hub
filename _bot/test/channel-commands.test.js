"use strict";

const chai = require('chai');
const { expect, assert } = chai;
const chaiAsPromised = require('chai-as-promised');
const { result } = require('lodash');
chai.use(chaiAsPromised);

describe('#channel commands', function () {

	// creating a command
	//  
	// modOnly: true|false
	// channelId
	// senderId 
	// message = {command: name, content: "go here to link your account"}

	// using a command

	// channelId
	// senderId 
	// message = {command: name, content: "go here to link your account", cooldown: XXms}

	// command: name
	// modOnly: true|false
	// content: "go here to link your account"
	// cooldown: XXms
	// alias?

	// {command: "social",{mod:false}, content: "go here to link your account", cooldown: 1000}



	// ["social",,"go here to link your account",100]
	// get command() { return [0] }
	// get content() { return [1] }
	// get cooldown() { return [2] }

	// user can issue command to create 
	// if so return user_id else throw

	const commander = require('../src/commander');
	const channelsApi = require('../src/api-interface/channels-api.js');

	it('should confirm user is channel owner', async () => {

		const user = {
			'room-id': '75987197',
			'user-id': '120614707'
		};

		let isOwner = channelsApi.isChannelOwner(user);
		expect(isOwner).to.be.equal(false);

		user["user-id"] = '75987197';
		isOwner = channelsApi.isChannelOwner(user);

		expect(isOwner).to.be.equal(true);
	});

	it('should confirm user is moderator of channel', async () => {

		const user = {
			'room-id': '75987197',
			'user-id': '120614707',
			mod: false
		};

		let isMod = channelsApi.isChanneMod(user);
		expect(isMod).to.be.equal(false);

		user["user-id"] = '75987197';
		user.mod = true;
		isMod = channelsApi.isChanneMod(user);

		expect(isMod).to.be.equal(true);
	});

	it('mod and channel owner create command', async () => {

		const username = 'naivebot';
		const id = '120614707';

		const user = {
			username: 'naivebot',
			'room-id': '75987197',
			'user-id': '120614707',
			mod: true
		};

		let result = channelsApi.canCreateCommand(user);
		expect(result).to.be.equal(true);

		user.mod = false;
		result = channelsApi.canCreateCommand(user);
		expect(result).to.be.equal(false);

		// broadcaster
		user['user-id'] = user['room-id'];
		result = channelsApi.canCreateCommand(user);
		expect(result).to.be.equal(true);
	});

	it('should parse addcommand to extract command parts', () => {

		const msg = `${commander.commandName('$addcommand')} discord join our discord https://discord.app.com`;
		const addArgs = commander.messageAsAddCommand(msg);

		expect(addArgs).to.have.property('add');
		expect(addArgs.add).to.have.property('name');
		expect(addArgs.add.name).to.be.equal('discord');
		expect(addArgs.add.params.length).to.be.equal(4);
		expect(addArgs.add.content).to.be.equal('join our discord https://discord.app.com');

	});

});