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

		console.log({ message: 'authenticated', timestamp: new Date().toLocaleTimeString() });
		res.status(200).send('Twitch API authenticated.  You can close this browser window/tab.');
	} catch (err) {
		console.error({ err, timestamp: new Date().toLocaleTimeString() });
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
		console.error({ err, timestamp: new Date().toLocaleTimeString() });
		res.status(500).send(err.message);
	}
});

app.post('/streams', async (req, res) => {

	try {
		const { ids } = req.body;

		const resUsers = await twitchRequest.getStreamsByIds(ids);
		res.json(resUsers);

	} catch (err) {
		console.error({ err, timestamp: new Date().toLocaleTimeString() });
		res.status(500).send(err.message);
	}
});

try {
	(async () => {

		const server = app.listen(process.env.TWITCH_SERVER_PORT || 7000, () => {
			const port = server.address().port;
			console.log({ message: `App listening on port ${port}`, timestamp: new Date().toLocaleTimeString() });

			const open = require('open');
			open(twitchRequest.authorizeUrl);
		});

		const settings_io = io_client(`ws://localhost:${process.env.SETTINGS_SERVER_PORT}`, {
			reconnection: true
		});
		const settingsSocket = settings_io.connect();

		settingsSocket.on('error', e => {
			console.log({ message: `error settings service server id: ${settingsSocket.id}`, e, timestamp: new Date().toLocaleTimeString() });
		});

		settingsSocket.on('connect', () => {
			console.log({ message: `connected to settings service server id: ${settingsSocket.id}`, timestamp: new Date().toLocaleTimeString() });

			settingsSocket.emit('initial-settings-request');
		});

		settingsSocket.on('initial-settings', async req => {
			console.log({ payload: req.payload });
			await pubsub.initialSettings(req)
				.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
		});

		settingsSocket.on('update-livestream-settings', async req => {
			console.log({ payload: req.payload, timestamp: new Date().toLocaleTimeString() });
			await pubsub.updateLivestreamSettings(req)
				.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
		});

		settingsSocket.on('disconnect', () => {
			console.log({ message: 'disconnected settings service server', timestamp: new Date().toLocaleTimeString() });
		});


		pubsub.connect();

		pubsub.onRedemption(data => {
			settings_io.emit('reward-redemption', { data });
		});

	})();
} catch (error) {
	console.error({ error, timestamp: new Date().toLocaleTimeString() });
}