/*
    settings server entry point
*/

"use strict";

require('dotenv').config({ path: __dirname + './../.env' });

const WebSocket = require('ws');

const express = require('express');

const settingsCache = require('./settings-cache');

const app = express();

let io = null;
let ws = null;

const MAX_BACKOFF_THRESHOLD_INTERVAL = 1000 * 60 * 2;
const BACKOFF_THRESHOLD_INTERVAL = 1000 * 3; //ms to wait before reconnect

let reconnectInterval = BACKOFF_THRESHOLD_INTERVAL;

/*

{
   "type":"update-livestream-settings",
   "payload":{
      "minRainAmount": 100000000.00000000,
      "minTipAmount": 10000000.00000000,
      "rainAlgorithm": 1,
      "ircTarget": "120524051",
      "txMessages": true,
      "txCooldownPerUser": 0.00000000,
      "enableTransactions": true,
      "ircEventPayments": true,
      "bitcornhubFunded": true,
      "bitcornPerBit": 321.00000000,
      "bitcornPerDonation": 123.00000000,
      "twitchRefreshToken": "<token>",
      "bitcornPerChannelpointsRedemption": 0.40000000,
      "enableChannelpoints": true
   }
}

*/

function reconnect() {
	console.log({ message: 'INFO: Reconnecting...' });
	reconnectInterval = floorJitterInterval(reconnectInterval * 2);
	if (reconnectInterval > MAX_BACKOFF_THRESHOLD_INTERVAL) {
		reconnectInterval = floorJitterInterval(MAX_BACKOFF_THRESHOLD_INTERVAL);
	}
	setTimeout(connect, reconnectInterval);
}

function floorJitterInterval(interval) {
	return Math.floor(interval + Math.random() * 1000);
}

function connect() {

	ws = new WebSocket("wss://bitcorndataservice-dev.azurewebsites.net/bitcornhub");

	ws.onerror = (error) => {
		console.log({ message: error.message, error, timestamp: new Date().toLocaleTimeString() });
	};

	ws.onopen = () => {
		console.log({ message: 'connected to bitcorndataservice api', timestamp: new Date().toLocaleTimeString() });
		reconnectInterval = BACKOFF_THRESHOLD_INTERVAL;
	};

	ws.onmessage = ({ data }) => {
		const obj = JSON.parse(data);
		console.log({ obj, timestamp: new Date().toLocaleTimeString() });

		switch (obj.type) {
			case 'initial-settings':
				settingsCache.applySettings(obj.payload);
				io.emit(obj.type, { payload: settingsCache.getItems() });
				break;
			case 'update-livestream-settings':
				settingsCache.applyItem(obj.payload);
				io.emit(obj.type, { payload: settingsCache.getItem(obj.payload.twitchUsername) });
				break;
			default:
				break;
		}
	};

	ws.onclose = () => {
		console.log({ message: 'bitcorndataservice api closed the connection', timestamp: new Date().toLocaleTimeString() });
		reconnect();
	};
}

if (module === require.main) {

	(async () => {
		try {

			const { server } = await new Promise(async (resolve) => {
				const server = app.listen(process.env.SETTINGS_SERVER_PORT, () => {
					resolve({ server: server });
				});
			});
			console.log({ message: `Settings server listening on port ${process.env.SETTINGS_SERVER_PORT}`, timestamp: new Date().toLocaleTimeString() })

			connect();

			io = require('socket.io')(server);

			io.on('connection', async (socket) => {

				console.log({ message: `client connection: ${socket.id}`, timestamp: new Date().toLocaleTimeString() });

				socket.on('initial-settings-request', () => {
					socket.emit('initial-settings', { payload: settingsCache.getItems() });
				});

				socket.on('disconnect', async () => {
					console.log({ message: `disconnect: ${socket.id}`, timestamp: new Date().toLocaleTimeString() });
				});
			});

		} catch (error) {
			console.log({ message: `Uncaught error in settings server main`, error, timestamp: new Date().toLocaleTimeString() });
		}
	})();
}