"use strict";

const CHANNEL = 'callowcreation';

if (module === require.main) {

	(async () => {

		const tmi = require('./src/tmi');
		const messenger = require('./src/messenger');
		const activityTracker = require('./src/activity-tracker');
		
		tmi.registerEvents();
		
		messenger.chatQueue.client = tmi.chatClient;
		messenger.whisperQueue.client = tmi.whisperClient;

		tmi.addMessageHandler(activityTracker.onChatMessage);
		tmi.addRewardHandlers();

		const results = await Promise.all([
			tmi.connectToChat(),
			tmi.connectToWhisper()
		]);

		tmi.addMessageOutputListener(console.log);
		tmi.addRewardOutputListener(console.log);

		console.log(results);

		const result = await tmi.joinChannel(CHANNEL);
		console.log(result);

		activityTracker.init();

	})();

}