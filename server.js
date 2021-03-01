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

			const connections = {}

			io.on('connection', async (socket) => {

				console.log({ message: `client connection: ${socket.handshake.headers.referer}` });
				app.emit('connection', socket);

				connections[socket.id] = socket;

				socket.on('disconnect', async () => {
					if (connections[socket.id]) {
						delete connections[socket.id];
					}
					console.log({ message: `disconnect: ${socket.handshake.headers.referer}` });
					app.emit('disconnect', socket);
				});

			});

			await helix.init(app);
			await pubsub.init(app);

			const settings_io = require('socket.io-client')(`http://localhost:${process.env.SETTINGS_SERVER_PORT}`);
			const settingsSocket = settings_io.connect();
			settingsSocket.on('connect', async () => {
				console.log('connected to settings service server');

				settingsSocket.on('update-all-settings', req => {
					console.log(req);
					app.emit('update-all-settings', { settings: req.settings });
				});

				settingsSocket.on('update-livestream-settings', async req => {
					console.log(req);
					app.emit('update-livestream-settings', { payload: req.payload });
				});

				settingsSocket.on('disconnect', () => {
					console.log('disconnected settings service server');
				});
			});

		} catch (error) {
			console.log({ success: false, message: `Uncaught error in main` });
			console.error(error);
		}
	})();
}