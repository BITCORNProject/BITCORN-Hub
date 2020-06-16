
/*

*/

"use strict";

const ERROR_MESSAGES = {
	noCreate: 'User can not create command'
};

function isChannelOwner(user) {
	return user['room-id'] == user['user-id'];
}

function isChanneMod(user) {
	return user.mod === true;
}

function canCreateCommand(user) {
	return isChannelOwner(user) || isChanneMod(user);
}

module.exports = {
	isChannelOwner,
	isChanneMod,
	canCreateCommand
};