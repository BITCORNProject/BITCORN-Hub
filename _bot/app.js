"use strict";

if (module === require.main) {

	(async () => {

		const tmi = require('./src/tmi');
		const messenger = require('./src/messenger');
		const activityTracker = require('./src/activity-tracker');
		const subTicker = require('./src/sub-ticker');
		const roomVisitor = require('./src/room-visitor');

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

		activityTracker.init();
		const subInit = await subTicker.init();
		console.log(subInit);

		const roomResult = await roomVisitor(tmi);
		console.log(roomResult);

	})();
}
