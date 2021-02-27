/*
    server entry point
*/

"use strict";

require('dotenv').config();

//const settingsCache = require('./_api-service/settings-cache');

const app = require('./source/config/express');

const helix = require('./source/config/authorize/helix');
const pubsub = require('./source/config/authorize/pubsub');

if (module === require.main) {

	(async () => {
		try {
			const { server } = await new Promise(async (resolve) => {
				const server = app.listen(process.env.PORT, () => {
					resolve({ server: server, port: server.address().port });
				});
			});
			console.log({ success: true, message: `Server listening on port ${process.env.PORT}` })

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

					
			//await settingsCache.requestSettings();		
			//settingsCache.startPolling();

			await helix.init(app);
			await pubsub.init();

		} catch (error) {
			console.log({ success: false, message: `Uncaught error in main` });
			console.error(error);
		}
	})();
}