/*
    server entry point
*/

"use strict";

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const io_client = require('socket.io-client');

const twitchRequest = require('./src/twitch-request');

const pubsub = require('./src/pubsub');

const app = express();
app.use(bodyParser.json());

app.get('/auth/helix/callback', async (req, res) => {
	try {

		await twitchRequest.authorize(req.query.code, req.query.state);
		
		console.log('authenticated');
		res.status(200).send('Twitch API authenticated.  You can close this browser window/tab.');
	} catch (err) {
		console.error(err);
		res.status(500).send(err.message);
	}
});

app.post('/users', async (req, res) => {

	try {
		const { ids, usernames } = req.body;

		if (ids) {
			const resUsers = await twitchRequest.getUsersByIds(ids);
			res.json(resUsers);
		} else if (usernames) {
			const resUsers = await twitchRequest.getUsersByName(usernames);
			res.json(resUsers);
		} else {
			res.status(404).end();
		}
	} catch (err) {
		console.error(err);
		res.status(500).send(err.message);
	}

});

try {
	(async () => {

		const server = app.listen(process.env.TWITCH_SERVER_PORT || 7000, () => {
			const port = server.address().port;
			console.log(`App listening on port ${port}`);
	
			const open = require('open');
			open(twitchRequest.authorizeUrl);
		});
		console.log({ success: true, message: `Server listening on port ${process.env.TWITCH_SERVER_PORT}` })

		pubsub.connect();

		const settings_io = io_client(`ws://localhost:${process.env.SETTINGS_SERVER_PORT}`, {
			reconnection: true
		});
		const settingsSocket = settings_io.connect();
	
		settingsSocket.on('error', e => {
			console.log(`error settings service server id: ${settingsSocket.id}`, e);
		});
	
		settingsSocket.on('connect', () => {
			console.log(`connected to settings service server id: ${settingsSocket.id}`);
	
			settingsSocket.emit('initial-settings-request');
		});
	
		settingsSocket.on('initial-settings', req => {
			pubsub.initialSettings(req);
		});
	
		settingsSocket.on('update-livestream-settings', async req => {
			pubsub.updateLivestreamSettings(req);
		});
	
		settingsSocket.on('disconnect', () => {
			console.log('disconnected settings service server');
		});
		
	})();
} catch (error) {
	console.log({ success: false, message: `Uncaught error in main` });
	console.error(error);
}