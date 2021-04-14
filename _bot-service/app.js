"use strict";

if (module === require.main) {

	(async () => {

		const settingsHelper = require('./settings-helper');
		const tmi = require('./src/tmi');
		const messenger = require('./src/messenger');
		const activityTracker = require('./src/activity-tracker');
		const subTicker = require('./src/sub-ticker');
		const roomVisitor = require('./src/room-visitor');
		const MESSAGE_TYPE = require('./src/utils/message-type');

		settingsHelper.init();

		tmi.registerEvents();

		messenger.chatQueue.client = tmi.chatClient;
		messenger.whisperQueue.client = tmi.whisperClient;

		tmi.addMessageHandler(activityTracker.onChatMessage);
		tmi.addRewardHandlers();

		const result = await tmi.connectToChat();
		console.log({ result, timestamp: new Date().toLocaleTimeString() });

		tmi.addMessageOutputListener(d => {
			if(d && d.message !== 'Just a message') console.log(d);
		});
		tmi.addRewardOutputListener(console.log);

		settingsHelper.onRedemption(async ({ data }) => {
			const redeemResult = data.redeemResult.data[0];
			const target = redeemResult.broadcaster_login;

			const txMessages = settingsHelper.getProperty(target, 'txMessages');
			if (!txMessages) return;

			const message = {
				//'UNFULFILLED': `@${redeemResult.user_name} redemption unfulfilled`, // <-- should never be a case it is just the other state
				'CANCELED': `@${redeemResult.user_name} your request was canceled`,
				'FULFILLED': `mttvCorn ${redeemResult.broadcaster_name} Just slipped @${redeemResult.user_name} a BITCORN redemption with a FIRM handshake. mttvCorn`
			}[data.status];

			messenger.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);
			messenger.sendQueuedMessagesByType(MESSAGE_TYPE.irc_chat);
		});

		const subInit = await subTicker.init();
		console.log({ success: subInit.success, timestamp: new Date().toLocaleTimeString() });

		const roomResult = await roomVisitor(tmi);
		console.log(roomResult);

	})();
}
