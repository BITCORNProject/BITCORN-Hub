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

		tmi.addMessageOutputListener(console.log);
		tmi.addRewardOutputListener(console.log);

		settingsHelper.onRedemption(async ({ data }) => {
			const redeemResult = data.redeemResult.data[0];
			const status = data.status;
			// if Enable Transaction chat responses
			const enableTxMgs = true;
			if (!enableTxMgs) return;

			const target = redeemResult.broadcaster_login;
			let message = '';

			switch (data.status) {
				case 'CANCELED': {
					message = `@${redeemResult.user_name} your request was canceled`;
				} break;
				case 'FULFILLED': {
					message = `mttvCorn ${redeemResult.broadcaster_name} Just slipped @${redeemResult.user_name} a BITCORN redemption with a FIRM handshake. mttvCorn`;
				} break;
				default:
					break;
			}

			messenger.enqueueMessageByType(MESSAGE_TYPE.irc_chat, target, message);
			messenger.sendQueuedMessagesByType(MESSAGE_TYPE.irc_chat);
		});
		console.log(result);

		activityTracker.init();
		const subInit = await subTicker.init();
		console.log(subInit);

		const roomResult = await roomVisitor(tmi);
		console.log(roomResult);

	})();
}
