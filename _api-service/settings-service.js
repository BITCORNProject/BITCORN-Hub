/*
    settings server entry point
*/

"use strict";

require('dotenv').config({ path: __dirname + './../.env' });

const WebSocket = require('ws');

const express = require('express');

const settingsCache = require('./settings-cache');

const app = express();

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
if (module === require.main) {

	(async () => {
		try {

			await settingsCache.requestSettings();

			const { server } = await new Promise(async (resolve) => {
				const server = app.listen(process.env.SETTINGS_SERVER_PORT, () => {
					resolve({ server: server });
				});
			});
			console.log({ success: true, message: `Settings server listening on port ${process.env.SETTINGS_SERVER_PORT}` })

			const io = require('socket.io')(server);

			const ws = new WebSocket("wss://bitcorndataservice-dev.azurewebsites.net/bitcornhub");

			ws.onopen = () => {
				console.log('connected to bitcorndataservice api');
			};

			ws.onmessage = ({ data }) => {
				const obj = JSON.parse(data);
				console.log(obj);
				io.emit(obj.type, { payload: obj.payload });
			};

			ws.onerror = (error) => {
				console.log(error);
			};

			ws.onclose = () => {
				console.log('bitcorndataservice api closed the connection');
			};

			io.on('connection', async (socket) => {

				console.log({ message: `client connection: ${socket.id}` });

				io.emit('update-all-settings', { settings: settingsCache.getItems() });

				socket.on('disconnect', async () => {
					console.log({ message: `disconnect: ${socket.id}` });
				});
			});

		} catch (error) {
			console.log({ success: false, message: `Uncaught error in settings server main` });
			console.error(error);
		}
	})();
}