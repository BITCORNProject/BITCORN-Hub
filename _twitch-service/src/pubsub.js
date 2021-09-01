/*

*/

"use strict";

const WebSocket = require('ws');

const twitchRequest = require('./twitch-request');

const { is_production, wrap_in_test_mode } = require('../../_api-shared/prod');
const databaseAPI = require('../../_api-shared/database-api');
const allowedUsers = require('../../_api-shared/allowed-users');

const recentIds = [];
const MAX_RECENT_ID_LENGTH = 5;

const HEARTBEAT_INTERVAL = 1000 * 60 * 4; //ms between PING's
const MAX_BACKOFF_THRESHOLD_INTERVAL = 1000 * 60 * 2;
const BACKOFF_THRESHOLD_INTERVAL = 1000 * 3; //ms to wait before reconnect

const MAX_PONG_WAIT_INTERVAL = 1000 * 10;

let ws;
let reconnectInterval = BACKOFF_THRESHOLD_INTERVAL;

let pingpongLog = '';
let pongWaitTimeout = null;
let heartbeatCounter = 0;

let listening = [];
const LISTEN_TYPES = {
	LISTEN: 'LISTEN',
	UNLISTEN: 'UNLISTEN'
};

const channelsPayload = {};

const CARD_PROMPT = wrap_in_test_mode(`Must be sync'd with BITCORNfarms in order to receive reward`);

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

function listen(channel_id, access_token) {
	if (ws.readyState !== WebSocket.OPEN) {
		console.log({ success: true, resultText: `listen: ws.readyState === ${ws.readyState}` });
		return;
	}

	const non = nonce(15);
	const topic = `channel-points-channel-v1.${channel_id}`;

	const listeningItem = listening.find(x => x.channel_id === channel_id);
	if (!listeningItem) {
		listening.push({ channel_id, nonce: non, type: LISTEN_TYPES.LISTEN });
	} else {
		listeningItem.nonce = non;
		listeningItem.type = LISTEN_TYPES.LISTEN;
	}

	const message = {
		type: LISTEN_TYPES.LISTEN,
		nonce: non,
		data: {
			topics: [topic],
			auth_token: access_token
		}
	};
	console.log({ success: true, resultText: 'SENT: ' + JSON.stringify(message) });

	ws.send(JSON.stringify(message));
}

function unlisten(channel_id, access_token) {
	if (ws.readyState !== WebSocket.OPEN) {
		console.log({ success: true, resultText: `unlisten: ws.readyState === ${ws.readyState}` });
		return;
	}

	const non = nonce(15);
	const topic = `channel-points-channel-v1.${channel_id}`;

	const listeningItem = listening.find(x => x.channel_id === channel_id);
	if (!listeningItem) return;

	listeningItem.nonce = non;
	listeningItem.type = LISTEN_TYPES.UNLISTEN;

	const message = {
		type: LISTEN_TYPES.UNLISTEN,
		nonce: non,
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

		listening = [];
		const stores = twitchRequest.getTokenAllStores();
		for (const channel_id in stores) {
			const store = stores[channel_id];
			listenToChannel({ channel_id, access_token: store.access_token });
		}
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

					const bitcorn_per_redemption = channelsPayload[redemption.channel_id].bitcornPerChannelpointsRedemption;
					const wrapped_in_test_mode = await wrappedQueryPointsCardTitle(bitcorn_per_redemption);
					if (reward.title !== wrapped_in_test_mode) break;

					if (recentIds.includes(redemption.id)) break;
					recentIds.push(redemption.id);

					redemptionUpdate.broadcaster_id = redemption.channel_id;
					redemptionUpdate.redemption_id = redemption.id;
					redemptionUpdate.reward_id = reward.id;

					if (allowedUsers.isCommandTesters(user.login) === false) {
						redemptionUpdate.status = 'CANCELED';
						throw new Error('User not allowed');
					}

					if (recentIds.length > MAX_RECENT_ID_LENGTH) {
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

					const result = await databaseAPI.channelPointsRequest(redemption.channel_id, data);

					if (result.status) {
						redemptionUpdate.status = 'CANCELED';
						throw new Error(`Channel Points Request Status: ${result.status} ${result.statusText}`);
					}

					if (result.length > 0 && !result[0].txId) {
						redemptionUpdate.status = 'CANCELED';
						throw new Error(`Channel Points Request User: ${result[0].to.twitchusername}`);
					}

					redemptionUpdate.status = 'FULFILLED';

					console.log({ result, timestamp: new Date().toLocaleTimeString() });

				} catch (error) {
					console.error({ error, timestamp: new Date().toLocaleTimeString() });
				}

				const redeemed = await twitchRequest.updateRedemptionStatus(redemptionUpdate)
					.then(redeemResult => invokeRedemptionCallbacks({ status: redemptionUpdate.status, redeemResult }))
					.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));

				console.log({ redeemed, timestamp: new Date().toLocaleTimeString() });

				break;
			case 'PONG':
				console.log({ resultText: `${pingpongLog} RECV #${heartbeatCounter}: ${JSON.stringify(value)}`, timestamp: new Date().toLocaleTimeString() });
				clearPongWaitTimeout();
				break;
			case 'RECONNECT':
				reconnect();
				break;
			case 'RESPONSE':

				const listeningItem = listening.find(x => x.nonce === value.nonce);
				if (value.error) {
					// TODO: add refresh token for bad auth error
					// I think when the app is static (not being used) the 
					// token expires and thr reqest for the points redemption fails
					console.log(value);
					listening = listening.filter(x => x.nonce !== value.nonce);
				} else {
					const { channel_id, type } = listeningItem;
					console.log({ [type]: channel_id, timestamp: new Date().toLocaleTimeString() });
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

	if (!payload) throw new Error('No payload from settings');

	const { twitchRefreshToken, ircTarget } = payload;
	if (!twitchRefreshToken) return;

	channelsPayload[ircTarget] = payload;

	const listeningItem = listening.find(x => x.channel_id === ircTarget);
	if (listeningItem) {
		if (listeningItem.type === LISTEN_TYPES.LISTEN && payload.enableChannelpoints === true) {
	
			const rewardsResult = await twitchRequest.getCustomRewards(ircTarget);		
			const reward = rewardsResult.data ? rewardsResult.data.find(x => x.id === payload.channelPointCardId) : null;
			
			if (reward) {
				const wrapped_in_test_mode = await wrappedQueryPointsCardTitle(payload.bitcornPerChannelpointsRedemption);
				const updateResult = await twitchRequest.updateCustomRewardTitle({ broadcaster_id: ircTarget, reward_id: reward.id, title: wrapped_in_test_mode });
				console.log({ updateResult });
			} else {
				const wrapped_in_test_mode = await wrappedQueryPointsCardTitle(payload.bitcornPerChannelpointsRedemption);
				const createResult = await makeCustomRewardCard(wrapped_in_test_mode, ircTarget);
				console.log({ createResult });
				
				if (createResult) {
					if (createResult.data) {
						payload.channelPointCardId = createResult.data[0].id;
					} else if (createResult.error) {
						console.error(createResult.error);
					}
				}
			}

			return;
		} else if (listeningItem.type === LISTEN_TYPES.UNLISTEN && payload.enableChannelpoints === false) {
			return;
		}
	}

	const tokenStore = twitchRequest.getTokenStore(ircTarget);
	const items = [];
	if (!tokenStore) {
		const { authenticated, ircTarget } = await refreshToken(twitchRefreshToken, ircTarget)
			.catch(e => console.log(e));
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

		for (const channel_id in payload) {

			channelsPayload[channel_id] = payload[channel_id];

			const { twitchRefreshToken, ircTarget } = payload[channel_id];

			const promise = refreshToken(twitchRefreshToken, ircTarget)
				.catch(e => {
					console.error(e);
					return { authenticated: null, ircTarget };
				});

			promises.push(promise);
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

async function refreshToken(refresh_token, irc_target) {
	if (refresh_token) {
		const authenticated = await twitchRequest.refreshAccessToken({
			refresh_token: refresh_token,
			client_id: process.env.API_CLIENT_ID,
			client_secret: process.env.API_SECRET
		});
		return { authenticated, ircTarget: irc_target };
	} else {
		return { authenticated: null, ircTarget: irc_target };
	}
}

async function handleChannelPointsCard(items, channels_payload) {

	for (let i = 0; i < items.length; i++) {
		// for (const key in items[i]) {
		// 	if (items[i].hasOwnProperty(key)) {
		// 		const strangeItem = items[i][key];
		// 		console.log({ key, strangeItem });
		// 	}
		// }
		try {
			const { authenticated, ircTarget } = items[i];

			const payload = channels_payload[ircTarget];

			if (!payload) throw new Error('Go, no go ??????');

			console.log({ payload, ircTarget });

			if (payload.enableChannelpoints === true) {

				await twitchRequest.getCustomRewards(ircTarget)
					.then(result => createCustomReward(result, payload, authenticated))
					.then(listenToChannel)
					.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
			} else {

				if (authenticated) {
					if (payload.channelPointCardId) {
						await twitchRequest.deleteCustomReward(ircTarget, payload.channelPointCardId);
					}
					unlisten(ircTarget, authenticated.access_token);

					payload.channelPointCardId = null;
				} else {
					console.log({ message: 'Can not unlistenn no access token', payload });
				}
			}
		} catch (error) {
			console.log(items[i]);
			console.error(error);
		}
	}
}

async function createCustomReward(result, payload_item, authenticated) {
	const card_id = channelsPayload[payload_item.ircTarget].channelPointCardId;
	const reward = result.data ? result.data.find(x => x.id === card_id) : null;

	if (reward) {
		const wrapped_in_test_mode = await wrappedQueryPointsCardTitle(payload_item.bitcornPerChannelpointsRedemption);
		const updateResult = await twitchRequest.updateCustomRewardTitle({ broadcaster_id: payload_item.ircTarget, reward_id: reward.id, title: wrapped_in_test_mode });
		console.log({ updateResult });

		payload_item.channelPointCardId = reward.id;
	} else {
		const wrapped_in_test_mode = await wrappedQueryPointsCardTitle(payload_item.bitcornPerChannelpointsRedemption);
		const createResult = await makeCustomRewardCard(wrapped_in_test_mode, payload_item.ircTarget);
		console.log({ createResult });

		if (createResult) {
			if (createResult.data) {
				payload_item.channelPointCardId = createResult.data[0].id;
			} else if (createResult.error) {
				console.error(createResult.error);
			}
		}
	}
	return { channel_id: payload_item.ircTarget, access_token: authenticated.access_token };
}

async function makeCustomRewardCard(title, channel_id) {
	const data = {
		title: title,
		cost: is_production ? 100000 : 1,
		prompt: CARD_PROMPT,
		should_redemptions_skip_request_queue: false
	};

	return twitchRequest.createCustomReward(channel_id, data)
		.catch(e => {
			console.error({ e, timestamp: new Date().toLocaleTimeString() });
		});
}

async function wrappedQueryPointsCardTitle(bitcorn_per_redemption) {
	try {
		const cardValue = Math.ceil(10000 * bitcorn_per_redemption);
		const card_title = `BITCORNx${cardValue}`;

		return wrap_in_test_mode(card_title);
	} catch (e) {
		console.log(e);
		return null;
	}
}

function listenToChannel({ channel_id, access_token }) {
	listen(channel_id, access_token);
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
	console.log({ response, timestamp: new Date().toLocaleTimeString() });
}

const redemptionCallbacks = [];

async function onRedemption(func) {
	redemptionCallbacks.push(func);
}

async function invokeRedemptionCallbacks(data) {
	const promises = [];
	for (let i = 0; i < redemptionCallbacks.length; i++) {
		const callback = redemptionCallbacks[i];
		promises.push(callback(data));
	}
	await Promise.all(promises);
}

module.exports = {
	connect,
	initialSettings,
	updateLivestreamSettings,
	onRedemption
};

