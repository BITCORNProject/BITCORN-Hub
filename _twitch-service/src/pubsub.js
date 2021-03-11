/*

*/

"use strict";

const WebSocket = require('ws');

const twitchRequest = require('./twitch-request');

const databaseAPI = require('../../_api-shared/database-api');

const recentIds = [];
const MAX_RECENT_ID_LENGTH = 5;

const HEARTBEAT_INTERVAL = 1000 * 60 * 4;//ms between PING's
const MAX_BACKOFF_THRESHOLD_INTERVAL = 1000 * 60 * 2;
const BACKOFF_THRESHOLD_INTERVAL = 1000 * 3; //ms to wait before reconnect

const MAX_PONG_WAIT_INTERVAL = 1000 * 10;

let ws;
let reconnectInterval = BACKOFF_THRESHOLD_INTERVAL;

let pingpongLog = '';
let pongWaitTimeout = null;
let heartbeatCounter = 0;

const CARD_TITLE = '(TESTMODE) BITCORNx420-TEST (TESTMODE)';

// Source: https://www.thepolyglotdeveloper.com/2015/03/create-a-random-nonce-string-using-javascript/
function nonce(length) {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function heartbeat() {
	if (ws.readyState !== WebSocket.OPEN) {
		console.log({ resultText: `heartbeat: ws.readyState === ${ws.readyState}` });
		return;
	}
	if (pongWaitTimeout) {
		console.log({ resultText: `Waiting... sent heartbeat #${heartbeatCounter}` });
		return;
	}

	heartbeatCounter++;

	const message = { type: 'PING' };
	pingpongLog = `SENT #${heartbeatCounter}: ${JSON.stringify(message)}`;
	ws.send(JSON.stringify(message));

	pongWaitTimeout = setTimeout(reconnect, MAX_PONG_WAIT_INTERVAL);
}

function listen(topic, access_token) {
	if (ws.readyState !== WebSocket.OPEN) {
		console.log({ success: true, resultText: `listen: ws.readyState === ${ws.readyState}` });
		return;
	}
	const message = {
		type: 'LISTEN',
		nonce: nonce(15),
		data: {
			topics: [topic],
			auth_token: access_token
		}
	};
	console.log({ success: true, resultText: 'SENT: ' + JSON.stringify(message) });
	ws.send(JSON.stringify(message));
}

function unlisten(topic, access_token) {
	if (ws.readyState !== WebSocket.OPEN) {
		console.log({ success: true, resultText: `unlisten: ws.readyState === ${ws.readyState}` });
		return;
	}
	const message = {
		type: 'UNLISTEN',
		nonce: nonce(15),
		data: {
			topics: [topic],
			auth_token: access_token
		}
	};
	console.log({ success: true, resultText: 'SENT: ' + JSON.stringify(message) });
	ws.send(JSON.stringify(message));
}

function connect() {

	let heartbeatHandle;

	ws = new WebSocket('wss://pubsub-edge.twitch.tv');

	ws.onopen = (event) => {
		console.log({ success: true, resultText: 'INFO: Socket Opened', event });
		heartbeat();
		heartbeatHandle = setInterval(heartbeat, HEARTBEAT_INTERVAL);

		reconnectInterval = BACKOFF_THRESHOLD_INTERVAL;
	};

	ws.onerror = (error) => {
		console.log({ success: false, resultText: `ERR #${heartbeatCounter}`, error });
	};

	ws.onmessage = async (event) => {
		const value = JSON.parse(event.data);
		// console.log({ value });
		switch (value.type) {
			case 'MESSAGE':

				const redemptionUpdate = {
					broadcaster_id: null,
					redemption_id: null,
					reward_id: null,
					status: null,
				};

				try {
					const message = JSON.parse(value.data.message);

					const redemption = message.data.redemption;
					const reward = redemption.reward;
					const user = redemption.user;

					if (reward.title !== CARD_TITLE) break;

					if (recentIds.includes(redemption.id)) break;
					recentIds.push(redemption.id);

					if(recentIds.length > MAX_RECENT_ID_LENGTH) {
						recentIds.splice(0, MAX_RECENT_ID_LENGTH / 2)
					}

					const data = {
						ircTarget: redemption.channel_id,
						from: `twitch|${redemption.channel_id}`,
						to: `twitch|${user.id}`,
						platform: 'twitch',
						channelPointAmount: reward.cost,
						columns: ['balance', 'twitchusername', 'isbanned']
					};

					const result = await databaseAPI.channelPointsRequest(user.id, data);

					redemptionUpdate.broadcaster_id = redemption.channel_id;
					redemptionUpdate.redemption_id = redemption.id;
					redemptionUpdate.reward_id = reward.id;

					if (result.status) {
						redemptionUpdate.status = 'CANCELED';
						throw new Error(`Channel Points Request Status: ${result.status}`);
					}

					redemptionUpdate.status = 'FULFILLED';

					console.log({ result });

					console.log(message.data);
				} catch (error) {
					console.error(error);
				}

				const redeemResult = await twitchRequest.updateRedemptionStatus(redemptionUpdate);
				console.log({ redeemResult });

				break;
			case 'PONG':
				console.log({ success: true, resultText: `${pingpongLog} RECV #${heartbeatCounter}: ${JSON.stringify(value)}` });
				clearPongWaitTimeout();
				break;
			case 'RECONNECT':
				reconnect();
				break;
			case 'RESPONSE':
				if (value.error) {
					console.log(value);
				}
				break;
			default:
				console.log({ success: false, resultText: `Unknown state: ${value.type}`, value });
				break;
		}
	};

	ws.onclose = (event) => {
		console.log({ success: false, resultText: 'INFO: Socket Closed', event });
		clearInterval(heartbeatHandle);
		reconnect();
	};
}

function reconnect() {
	if (ws && ws.readyState !== WebSocket.OPEN) {
		ws.close();
	}
	clearPongWaitTimeout();
	console.log({ success: false, resultText: 'INFO: Reconnecting...' });
	reconnectInterval = floorJitterInterval(reconnectInterval * 2);
	if (reconnectInterval > MAX_BACKOFF_THRESHOLD_INTERVAL) {
		reconnectInterval = floorJitterInterval(MAX_BACKOFF_THRESHOLD_INTERVAL);
	}
	setTimeout(connect, reconnectInterval);
}

function floorJitterInterval(interval) {
	return Math.floor(interval + Math.random() * 1000);
}

function clearPongWaitTimeout() {
	if (pongWaitTimeout) {
		clearTimeout(pongWaitTimeout);
		pongWaitTimeout = null;
	}
}

async function updateLivestreamSettings({ payload }) {

	const { twitchRefreshToken, ircTarget } = payload;

	if (!twitchRefreshToken) return;

	const tokenStore = twitchRequest.getTokenStore(ircTarget);
	const items = [];
	if (!tokenStore && twitchRefreshToken) {
		const authenticated = await twitchRequest.refreshAccessToken({
			refresh_token: twitchRefreshToken,
			client_id: process.env.API_CLIENT_ID,
			client_secret: process.env.API_SECRET
		});
		items.push({ authenticated, ircTarget });
		twitchRequest.storeTokens(items);
	} else {
		items.push({ authenticated: tokenStore, ircTarget });
	}

	await handleChannelPointsCard(items, { [ircTarget]: payload });

	await sendTokensToApi(items, { [ircTarget]: payload });
}

async function initialSettings({ payload }) {
	try {
		const promises = [];

		for (const channel in payload) {

			const { twitchRefreshToken, ircTarget } = payload[channel];

			promises.push(new Promise(async resolve => {
				if (twitchRefreshToken) {
					const authenticated = await twitchRequest.refreshAccessToken({
						refresh_token: twitchRefreshToken,
						client_id: process.env.API_CLIENT_ID,
						client_secret: process.env.API_SECRET
					});
					resolve({ authenticated, ircTarget });
				} else {
					resolve({ authenticated: null, ircTarget });
				}
			}));
		}

		const items = await Promise.all(promises);

		twitchRequest.storeTokens(items.map(({ authenticated, ircTarget }) => ({ authenticated, ircTarget })));

		while (ws.readyState !== WebSocket.OPEN) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		await handleChannelPointsCard(items, payload);

		await sendTokensToApi(items, payload);

	} catch (error) {
		console.log(error);
	}
}

async function handleChannelPointsCard(items, payload) {

	for (let i = 0; i < items.length; i++) {
		// for (const key in items[i]) {
		// 	if (items[i].hasOwnProperty(key)) {
		// 		const strangeItem = items[i][key];
		// 		console.log({ key, strangeItem });
		// 	}
		// }
		try {
			const { authenticated, ircTarget } = items[i];

			const item = payload[ircTarget];

			if (!item) throw new Error('Go, no go ??????');

			console.log({ item, ircTarget });

			if (item.enableChannelpoints === true) {

				await twitchRequest.getCustomReward(ircTarget)
					.then(result => createListenCustomReward(result, CARD_TITLE, item, authenticated))
					.then(({ item, access_token }) => {
						listenToChannel(item, access_token);
					})
					.catch(e => {
						console.log(e);
					});
			} else {

				if (authenticated) {
					if (item.channelPointCardId) {
						await twitchRequest.deleteCustomReward(ircTarget, item.channelPointCardId);
					}
					unlisten(`channel-points-channel-v1.${ircTarget}`, authenticated.access_token);
					
					item.channelPointCardId = null;
					console.log(`stopped listening: ${ircTarget}`);
				} else {
					console.log({ message: 'Can not unlistenn no access token', item });
				}
			}
		} catch (error) {
			console.log(items[i]);
			console.error(error);
		}
	}
}

async function createListenCustomReward(result, cardTitle, item, authenticated) {

	const reward = result.data ? result.data.find(x => x.title === cardTitle) : null;

	if (!reward) {
		const data = {
			title: cardTitle,
			cost: 1,
			prompt: `(TESTMODE) Must be sync'd with BITCORNfarms in order to receive reward. 100:1 ratio. (TESTMODE)`,
			should_redemptions_skip_request_queue: false
		};

		const results = await twitchRequest.createCustomReward(item.ircTarget, data).catch(e => {
			console.log(e);
		});

		if (results) {
			if (results.data) {
				item.channelPointCardId = results.data[0].id;
			} else if (results.error) {
				console.error(results.error);
			}
		}
	} else {
		item.channelPointCardId = reward.id;
	}
	return { item, access_token: authenticated.access_token };
}

function listenToChannel(item, access_token) {
	if (item.channelPointCardId) {
		listen(`channel-points-channel-v1.${item.ircTarget}`, access_token);
		console.log(`listening: ${item.ircTarget}`);
	}
}

async function sendTokensToApi(items, payload) {
	// TypeError: Cannot destructure property `refresh_token` of 'undefined' or 'null'.
	// const tokens = items.map(({ authenticated: { refresh_token }, ircTarget }) => {
	// 	return ({ refreshToken: refresh_token, ircTarget, channelPointCardId: payload[ircTarget].channelPointCardId });
	// });	
	const tokens = items.map(({ authenticated, ircTarget }) => {
		return {
			refreshToken: authenticated ? authenticated.refresh_token : null,
			ircTarget,
			channelPointCardId: payload[ircTarget].channelPointCardId
		};
	});
	const response = await databaseAPI.sendTokens({ tokens: tokens });
	console.log({ response });
}

module.exports = {
	connect,
	initialSettings,
	updateLivestreamSettings
};

