/*
    server entry point
*/

"use strict";

const orderedRequires = [];

orderedRequires.push(require('./source/config/authorize/kraken'));
orderedRequires.push(require('./source/config/authorize/helix'));

const app = require('./source/config/express');
const auth = require('./settings/auth');

if (module === require.main) {

	(async () => {
		try {
			const { server } = await new Promise(async (resolve) => {
				const server = app.listen(auth.data.PORT, () => {
					resolve({ server: server, port: server.address().port });
				});
			});
			console.log({ success: true, message: `Server listening on port ${auth.data.PORT}` })

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

			for (let i = 0; i < orderedRequires.length; i++) {
				const item = orderedRequires[i];
				console.log(await item.init(app));
			}

		} catch (error) {
			console.log({ success: false, message: `Uncaught error in main` });
			console.error(error);
		}
	})();
}