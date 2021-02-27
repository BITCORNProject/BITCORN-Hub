"use strict";

if (module === require.main) {

	(async () => {

		const tmi = require('./src/tmi');
		const settingsCache = require('../_api-service/settings-cache');
		const messenger = require('./src/messenger');
		const activityTracker = require('./src/activity-tracker');
		const subTicker = require('./src/sub-ticker');
		const roomVisitor = require('./src/room-visitor');		
		
		await settingsCache.requestSettings();
		
		settingsCache.startPolling();

		tmi.registerEvents();

		messenger.chatQueue.client = tmi.chatClient;
		messenger.whisperQueue.client = tmi.whisperClient;

		tmi.addMessageHandler(activityTracker.onChatMessage);
		tmi.addRewardHandlers();

		const result = await tmi.connectToChat();

		tmi.addMessageOutputListener(console.log);
		tmi.addRewardOutputListener(console.log);

		console.log(result);

		activityTracker.init();
		const subInit = await subTicker.init();
		console.log(subInit);

		const roomResult = await roomVisitor(tmi);
		console.log(roomResult);

	})();
}
