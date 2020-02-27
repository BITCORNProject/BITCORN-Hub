/*
    Main entry point
*/

"use strict";

exports.isProduction = process.env.NODE_ENV === 'development' ? false : true;
exports.isDevelopment = !exports.isProduction;

let io = null;
exports.io = () => io;

(async () => {
    try {

        const orderedRequires = [];

        orderedRequires.push(require('./source/config/tmi'));
        orderedRequires.push(require('./source/config/authorize/kraken'));
        orderedRequires.push(require('./source/config/authorize/helix'));
        orderedRequires.push(require('./source/control-panel'));
        orderedRequires.push(require('./source/activity-tracker'));

        //orderedRequires.push(require('./source/sub-ticker'));
        if (exports.isProduction) {
        }
        
        orderedRequires.push(require('./source/announcement-scheduler'));

        const app = require('./source/config/express');

        const auth = require('./settings/auth');

        const { server } = await new Promise(async (resolve) => {
            const server = app.listen(auth.data.PORT, () => {
                resolve({ server: server, port: server.address().port });
            });
        });
        console.log({ success: true, message: `Server listening on port ${auth.data.PORT}` })

        io = require('socket.io')(server);

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