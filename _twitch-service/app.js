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
const settingsCache = require('../_settings-service/settings-cache');

const NOT_RESPONDING_TIMEOUT = 1000;

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



			const cards_data = [];
			for (const key in req.payload) {

				const channel_id = key;
				const card_id = req.payload[channel_id]['channelPointCardId'];
				const cornPerRedemption = req.payload[channel_id]['bitcornPerChannelpointsRedemption'];
				const cardValue = 10000 * cornPerRedemption;
				const card_title = `BITCORNx${cardValue}`;

				const card_data = {
					channel_id,
					card_id,
					card_title,
					corn_per_redemption: cornPerRedemption
				};
				cards_data.push(card_data);
			}
			settingsSocket.emit('set-points-cards-all', cards_data);
		});

		settingsSocket.on('update-livestream-settings', async req => {
			console.log({ payload: req.payload, timestamp: new Date().toLocaleTimeString() });
			await pubsub.updateLivestreamSettings(req)
				.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));



			const channel_id = req.payload['ircTarget'];
			const card_id = req.payload['channelPointCardId'];
			const cornPerRedemption = req.payload['bitcornPerChannelpointsRedemption'];
			const cardValue = 10000 * cornPerRedemption;
			const card_title = `BITCORNx${cardValue}`;
			const card_data = {
				channel_id,
				card_id,
				card_title,
				corn_per_redemption: cornPerRedemption
			};
			settingsSocket.emit('set-points-card', card_data);
		});

		settingsSocket.on('disconnect', () => {
			console.log({ message: 'disconnected settings service server', timestamp: new Date().toLocaleTimeString() });
		});

		pubsub.onRedemption(data => {
			settings_io.emit('reward-redemption', { data });
		});

		pubsub.onCardNameRequest(async (channel_id) => {
			console.log({ channel_id, info: 'Card name request' });
			const { data } = await getPointsCard(channel_id);

			console.log({'data[0]': data[0]});
			return data[0];
		});

		pubsub.connect();

		async function getPointsCard(channel_id) {
			return new Promise((resolve, reject) => {
				try {
					settingsSocket.once('send-points-card', resolve);
					settingsSocket.emit('get-points-card', { channel_id });
					setTimeout(() => reject(`Local data store not responding for getPointsCard timeout: ${NOT_RESPONDING_TIMEOUT}`), NOT_RESPONDING_TIMEOUT);
				} catch (error) {
					reject(error);
				}
			}).catch(error => console.error({ error, timestamp: new Date().toLocaleTimeString() }));
		}

	})();
} catch (error) {
	console.error({ error, timestamp: new Date().toLocaleTimeString() });
}