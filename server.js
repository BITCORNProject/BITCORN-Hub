/*
    server entry point
*/

"use strict";

require('dotenv').config();

const app = require('./source/config/express');

const helix = require('./source/config/authorize/helix');
const pubsub = require('./source/config/authorize/pubsub');

if (module === require.main) {

	(async () => {
		try {
			const { server } = await new Promise(async (resolve) => {
				const server = app.listen(process.env.TWITCH_SERVER_PORT, () => {
					resolve({ server: server, port: server.address().port });
				});
			});
			console.log({ success: true, message: `Server listening on port ${process.env.TWITCH_SERVER_PORT}` })

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

			await helix.init(app);
			await pubsub.init();

			const WebSocket = require('ws');
			const ws = new WebSocket(`ws://localhost:${process.env.SETTINGS_SERVER_PORT}`);

			ws.on('open', function open() {
				console.log('Connected');
			});

			ws.on('message', function incoming(data) {
				console.log(data);
			});

			/*const settings_io = require('socket.io-client')(`http://localhost:${process.env.SETTINGS_SERVER_PORT}`);
			const settingsSocket = settings_io.connect();
			settingsSocket.on('connect', async () => {

				settingsSocket.on('settings-updated', res => {
					console.log(res);
				});
				console.log('settings service server connected');

			});*/

		} catch (error) {
			console.log({ success: false, message: `Uncaught error in main` });
			console.error(error);
		}
	})();
}