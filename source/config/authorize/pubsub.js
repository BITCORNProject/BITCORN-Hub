/*

*/

"use strict";

const WebSocket = require('ws');

const helix = require('./helix');

const databaseAPI = require('../../../_api-service/database-api');

const recentIds = [];
let pingpongLog = '';

const HEARTBEAT_INTERVAL = 1000 * 60 * 4;//ms between PING's
const MAX_BACKOFF_THRESHOLD_INTERVAL = 1000 * 60 * 2;
const BACKOFF_THRESHOLD_INTERVAL = 1000 * 3; //ms to wait before reconnect

const MAX_PONG_WAIT_INTERVAL = 1000 * 10;

let ws;
let reconnectInterval = BACKOFF_THRESHOLD_INTERVAL;

let pongWaitTimeout = null;
let heartbeatCounter = 0;

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
	if (pongWaitTimeout !== null) {
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

function connect() {
	return new Promise((resolve, reject) => {

		let heartbeatHandle;

		ws = new WebSocket('wss://pubsub-edge.twitch.tv');

		ws.onopen = (event) => {
			console.log({ success: true, resultText: 'INFO: Socket Opened', event });
			heartbeat();
			heartbeatHandle = setInterval(heartbeat, HEARTBEAT_INTERVAL);

			reconnectInterval = BACKOFF_THRESHOLD_INTERVAL;
			resolve();
		};

		ws.onerror = (error) => {
			console.log({ success: false, resultText: `ERR #${heartbeatCounter}: ${JSON.stringify(error)}` });
			reject();
		};

		ws.onmessage = async (event) => {
			const value = JSON.parse(event.data);
			switch (value.type) {
				case 'MESSAGE':

					const message = JSON.parse(value.data.message);
					const id = message.data.redemption.id;
					if (recentIds.includes(id)) break;
					recentIds.push(id);
					const reward = message.data.redemption.reward;
					const user = message.data.redemption.user;

					console.log(message.data);
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

		ws.onclose = () => {
			console.log({ success: false, resultText: 'INFO: Socket Closed' });
			clearInterval(heartbeatHandle);
			reconnect();
		};
	});
}

function reconnect() {
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
	if (pongWaitTimeout !== null) {
		clearTimeout(pongWaitTimeout);
		pongWaitTimeout = null;
	}
}

async function init() {
	try {
		
		const data = await databaseAPI.makeRequestChannelsSettings();
		console.log(data);

		const promises = [];

		for (const channel in data) {

			const { twitchRefreshToken, ircTarget } = data[channel];

			promises.push(new Promise(async resolve => {

				const requestToken = await helix.refreshAccessToken({
					refresh_token: twitchRefreshToken,
					client_id: process.env.API_CLIENT_ID,
					client_secret: process.env.API_SECRET
				});

				const authenticated = twitchRefreshToken ? requestToken : {
					access_token: null,
					refresh_token: null,
					expires_in: 0,
					scope: null,
					token_type: null
				};

				resolve({ authenticated, ircTarget });
			}));
		}

		const items = await Promise.all(promises);

		helix.storeTokens(items.map(({ authenticated, ircTarget }) => ({ authenticated, ircTarget })));

		await connect();

		for (let i = 0; i < items.length; i++) {
			const { authenticated, ircTarget: channelId } = items[i];

			
			
			const data = {
				title: 'BITCORNx420-TEST', // maybe title in dashboard settings
				cost: 420, // to be replaced by dashboard settings from the api
				prompt: `Must be sync'd with BITCORNfarms in order to receive reward. 100:1 ratio.`,
				should_redemptions_skip_request_queue: true
			};
			const result = await helix.createCustomReward(channelId, data);
			// if settings channel point redemption is enabled

			if (authenticated.access_token) {
				listen(`channel-points-channel-v1.${channelId}`, authenticated.access_token);
				console.log(`listening: ${channelId}`);
			} else {
				console.log({ result });
			}
		}

		// make sure these are sent back to the api
		const response = await databaseAPI.sendTokens(items.map(({ authenticated: { refresh_token }, ircTarget }) => ({ refreshToken: refresh_token, ircTarget })));
		console.log({response});
	} catch (err) {

		console.error(err);
	}
}

module.exports = {
	init,
	connect,
	listen
};
