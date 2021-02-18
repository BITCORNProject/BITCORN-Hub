/*

*/

"use strict";

const JsonFile = require('./utils/json-file');
const serverSettings = require('../settings/server-settings');
const allowedUsers = require('./utils/allowed-users');

const MAX_RAIN_USER_CACHE = serverSettings.MAX_RAIN_USER_CACHE;
const MAX_RAIN_USER_CACHE_WITH_PADDING = MAX_RAIN_USER_CACHE * 1.4;
let activeChatters = {};

function onChatMessage(target, user, msg, self) {
	const event = { target, user, msg, self };
	//if (event.self) { return { success: false, message: `self`, event }; }
	addToActiveChatters(target, event.user['user-id'], event.user.username);
}

const activityTracker = new JsonFile('../../settings/activity-tracker.json', {});

//console.log('MAX_RAIN_USER_CACHE_WITH_PADDING', activityTracker.data);

function addToActiveChatters(target, id, username) {
	if (allowedUsers.activityTrackerOmitUsername(username) === true) return;

	if (activeChatters[target] === undefined) {
		activeChatters[target] = [];
	}

	activeChatters[target] = activeChatters[target].filter(x => x);

	const indexed = activeChatters[target].filter(x => x).map((x, i) => ({ index: i, id: x.id, username: x.username, count: x.count }));

	let found = indexed.filter(x => x.id === id)[0];

	if (!found) {
		activeChatters[target].unshift({ index: 0, id, username, count: 0 });
		found = activeChatters[target][0];
	}

	const current = activeChatters[target].splice(found.index, 1)[0];

	delete current.index;

	current.count += 1;

	activeChatters[target].unshift(current);

	activeChatters[target].length = MAX_RAIN_USER_CACHE_WITH_PADDING;

	activityTracker.setValues(activeChatters);
}

function getChatterActivity(target) {

	if (activeChatters[target] === undefined) return [];

	let chatternamesArr = [];
	chatternamesArr = chatternamesArr.concat(activeChatters[target]);
	chatternamesArr.length = MAX_RAIN_USER_CACHE;

	// INFO:    Comment below 'sort' to use most active
	//          Uncomment to use most recent
	//chatternamesArr.sort((a, b) => b.count - a.count);

	chatternamesArr = chatternamesArr.filter(x => x).map(x => ({ id: x.id, username: x.username }));

	return chatternamesArr;
}

function init() {
	activeChatters = activityTracker.getValues();

	//console.log({ activeChatters });

	return { success: true };
}

module.exports = {
	init,
	onChatMessage,
	getChatterActivity
};

