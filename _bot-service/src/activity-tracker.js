/*

*/

"use strict";

const serverSettings = require('../../settings/server-settings.json');
const allowedUsers = require('../../_api-shared/allowed-users');
const settingsHelper = require('../settings-helper');

const MAX_RAIN_USER_CACHE_WITH_PADDING = serverSettings.MAX_RAIN_USERS * 1.4;

function onChatMessage(target, user, msg, self) {
	const event = { target, user, msg, self };
	
	if (event.self) { return { success: false, message: `self`, event }; }
	if (event.user['message-type'] === 'whisper') { return { success: false, message: 'Not activity tracking whispers', event }; }
	
	addToActiveChatters(target, event.user['user-id'], event.user.username);
}

function addToActiveChatters(target, user_id, username) {
	if (allowedUsers.activityTrackerOmitUsername(username) === true) return;

	try {
		const channel_id = settingsHelper.getProperty(target, 'ircTarget');

		settingsHelper.sendChannelActivity({ channel_id, user_id, username });
	} catch (error) {
		console.error(error);
	}
}

async function getChatterActivity(target) {
	try {
		const channel_id = settingsHelper.getProperty(target, 'ircTarget');
		const chattersDB = await settingsHelper.getChannelActivity(channel_id, MAX_RAIN_USER_CACHE_WITH_PADDING);

		return chattersDB ? settingsHelper.getRainAlgorithmResult(target, chattersDB.data) : [];
	} catch (error) {
		console.error(error);
		return [];
	}
}

module.exports = {
	onChatMessage,
	getChatterActivity
};

