/*
    settings server entry point
*/

"use strict";

require('dotenv').config({ path: __dirname + './../.env' });

const WebSocket = require('ws');
const express = require('express');

const { is_production } = require('../_api-shared/prod');
const apiRequest = require('../_api-shared/api-request');

const sql_db_auth = require(`../settings/sql_db_auth.json`);
const rooturl = require('../settings/rooturl.json');

const settingsCache = require('./settings-cache');

const app = express();

let io = null;
let ws = null;

const MAX_BACKOFF_THRESHOLD_INTERVAL = 1000 * 60 * 2;
const BACKOFF_THRESHOLD_INTERVAL = 1000 * 3; //ms to wait before reconnect

let reconnectInterval = BACKOFF_THRESHOLD_INTERVAL;

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

async function connect() {

	const sql_auth = is_production ? sql_db_auth['production'] : sql_db_auth['development'];
	const { access_token } = await apiRequest.getCachedToken(sql_auth);

	const uri = is_production ? rooturl.websocket.production : rooturl.websocket.development;
	ws = new WebSocket(uri, ['client', access_token]);

	ws.onerror = (error) => {
		console.log({ message: error.message, error, timestamp: new Date().toLocaleTimeString() });
	};

	ws.onopen = () => {
		console.log({ message: 'connected to bitcorndataservice api', timestamp: new Date().toLocaleTimeString() });
		reconnectInterval = BACKOFF_THRESHOLD_INTERVAL;
	};

	ws.onmessage = ({ data }) => {
		try {
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
		} catch (error) {
			console.error(error);
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

			io.on('connection', (socket) => {

				console.log({ message: `client connection: ${socket.id}`, timestamp: new Date().toLocaleTimeString() });

				socket.on('initial-settings-request', () => {
					socket.emit('initial-settings', { payload: settingsCache.getItems() });
				});

				socket.on('reward-redemption', (data) => {
					io.emit('reward-redemption', { data });
				});

				socket.on('set-activity-tracker', (data) => {
					io.emit('set-activity-tracker', { data });
				});

				socket.on('get-activity-tracker', (data) => {
					io.emit('get-activity-tracker', { data });
				});

				socket.on('send-activity-tracker', (data) => {
					io.emit('send-activity-tracker', { data });
				});


				socket.on('set-transaction-tracker', (data) => {
					io.emit('set-transaction-tracker', { data });
				});

				socket.on('get-transaction-tracker', (data) => {
					io.emit('get-transaction-tracker', { data });
				});

				socket.on('send-transaction-tracker', (data) => {
					io.emit('send-transaction-tracker', { data });
				});


				socket.on('set-error-tracker', (data) => {
					io.emit('set-error-tracker', { data });
				});

				socket.on('get-error-tracker', (data) => {
					io.emit('get-error-tracker', { data });
				});

				socket.on('send-error-tracker', (data) => {
					io.emit('send-error-tracker', { data });
				});

				socket.on('disconnect', () => {
					console.log({ message: `disconnect: ${socket.id}`, timestamp: new Date().toLocaleTimeString() });
				});
			});

		} catch (error) {
			console.log({ message: `Uncaught error in settings server main`, error, timestamp: new Date().toLocaleTimeString() });
		}
	})();
}