"use strict";

const CHANNEL = 'callowcreation';

if (module === require.main) {

	(async () => {

		const tmi = require('./src/tmi');
		const messenger = require('./src/messenger');
		
		tmi.registerEvents();
		
		messenger.chatQueue.client = tmi.chatClient;
		messenger.whisperQueue.client = tmi.whisperClient;

		const results = await Promise.all([
			tmi.connectToChat(),
			tmi.connectToWhisper()
		]);

		console.log(results);

		const result = await tmi.joinChannel(CHANNEL);
		console.log(result);

	})();

}