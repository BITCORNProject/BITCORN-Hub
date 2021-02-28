/*
    settings server entry point
*/

"use strict";

require('dotenv').config({ path: __dirname + './../.env' });

const WebSocket = require('ws');

const express = require('express');

const settingsCache = require('./settings-cache');

const app = express();

if (module === require.main) {

	(async () => {
		try {

			const ws = new WebSocket("wss://bitcorndataservice-dev.azurewebsites.net/bitcornhub");

			ws.on('open', function open() {
				console.log('Connected');
			});

			ws.on('message', function incoming(data) {
				console.log(data);
/*

{
   "type":"update-livestream-settings",
   "payload":{
      "MinRainAmount":100000000.00000000,
      "MinTipAmount":10000000.00000000,
      "RainAlgorithm":1,
      "IrcTarget":"120524051",
      "TxMessages":true,
      "TxCooldownPerUser":0.00000000,
      "EnableTransactions":true,
      "IrcEventPayments":true,
      "BitcornhubFunded":true,
      "BitcornPerBit":321.00000000,
      "BitcornPerDonation":123.00000000,
      "TwitchRefreshToken":"<token>",
      "BitcornPerChannelpointsRedemption":0.40000000,
      "EnableChannelpoints":true
   }
}

*/				
				io.emit('settings-updated', { settings: {} });
			});

			ws.onerror = (error) => {
				console.log(error);
			};

			const { server } = await new Promise(async (resolve) => {
				const server = app.listen(process.env.SETTINGS_SERVER_PORT, () => {
					resolve({ server: server, port: server.address().port });
				});
			});
			console.log({ success: true, message: `Settings server listening on port ${process.env.SETTINGS_SERVER_PORT}` })

			const io = require('socket.io')(server);

			const connections = new Map();

			io.on('connection', async (socket) => {
				if (connections.has(socket.id) === true) {
					console.log("PROBLEM ???");
				}

				console.log({ message: `client connection: ${socket.handshake.headers.referer}` });
				app.emit('connection', socket);

				connections.set(socket.id, socket);

				socket.on('disconnect', async () => {
					if (connections.has(socket.id) === true) {
						connections.delete(socket.id);
					}
					console.log({ message: `disconnect: ${socket.handshake.headers.referer}` });
					app.emit('disconnect', socket);
				});
			});

			await settingsCache.requestSettings();
			
			io.emit('settings-updated', { settings: settingsCache.getItems() });

		} catch (error) {
			console.log({ success: false, message: `Uncaught error in settings server main` });
			console.error(error);
		}
	})();
}