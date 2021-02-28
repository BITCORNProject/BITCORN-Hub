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

		const result = await tmi.connectToChat();

		tmi.addMessageOutputListener(console.log);
		tmi.addRewardOutputListener(console.log);

		console.log(result);

		activityTracker.init();
		const subInit = await subTicker.init();
		console.log(subInit);

		const roomResult = await roomVisitor(tmi);
		console.log(roomResult);

		
		const settings_io = require('socket.io-client')(`http://localhost:${process.env.SETTINGS_SERVER_PORT}`);
		const settingsSocket = settings_io.connect();
		settingsSocket.on('connect', async () => {

			console.log('settings service server connected');

			settingsSocket.on('settings-updated', res => {
				console.log(res.settings);	
			});

		});

	})();
}
