/*
    settings server entry point
*/

"use strict";

require('dotenv').config({ path: __dirname + './../.env' });

const express = require('express');

const settingsCache = require('./settings-cache');

const app = express();

// app.get('/', function (req, res) {
// 	res.send('hello world');
// });

if (module === require.main) {

	(async () => {
		try {

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
			settingsCache.startPolling(settings => {
				io.emit('settings-updated', { settings });
				console.log('settings serviceupdated');
			});

		} catch (error) {
			console.log({ success: false, message: `Uncaught error in settings server main` });
			console.error(error);
		}
	})();
}