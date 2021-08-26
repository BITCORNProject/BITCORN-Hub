/*

*/

"use strict";

require('dotenv').config({ path: __dirname + './../.env' });

const io_client = require('socket.io-client');
const {
	connect,
	createOrUpdateActivityTracker,
	queryChannelActivityTracker,
	insertTransactionTracker,
	queryChannelTransactionTracker,
	insertErrorTracker,
	queryChannelErrorTracker,
	createOrUpdateChannelPointsCardsAll,
	createOrUpdateChannelPointsCard,
	queryChannelPointsCard
} = require('./local-db');

// any abturary value is on this is like any loop ment to keep the program alive
const UPDATE_TICK_MS = 1000 * 60;

async function init() {
	const settings_io = io_client(`ws://localhost:${process.env.SETTINGS_SERVER_PORT}`, {
		reconnection: true
	});

	const settingsSocket = settings_io.connect();

	settingsSocket.on('error', e => {
		console.log({ message: `error settings service server id: ${settingsSocket.id}`, e, timestamp: new Date().toLocaleTimeString() });
	});

	settingsSocket.on('connect', () => {
		console.log({ message: `connected to settings service server id: ${settingsSocket.id}`, timestamp: new Date().toLocaleTimeString() });
	});

	settingsSocket.on('set-activity-tracker', ({ data }) => {
		createOrUpdateActivityTracker(data)
			.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
	});

	settingsSocket.on('get-activity-tracker', ({ data }) => {
		queryChannelActivityTracker({ channel_id: data.channel_id, limit_amount: data.limit_amount })
			.then(results => settings_io.emit('send-activity-tracker', results.map(x => ({ id: x.user_id, username: x.username }))))
			.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
	});

	settingsSocket.on('set-transaction-tracker', ({ data }) => {
		insertTransactionTracker(data)
			.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
	});

	settingsSocket.on('get-transaction-tracker', ({ data }) => {
		queryChannelTransactionTracker(data)
			.then(results => settings_io.emit('send-transaction-tracker', results.map(x => ({
				in_message: x.in_message,
				out_message: x.out_message,
				user_id: x.user_id,
				channel_id: x.channel_id,
				success: x.success,
			}))))
			.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
	});

	settingsSocket.on('set-error-tracker', ({ data }) => {
		insertErrorTracker(data)
			.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
	});

	settingsSocket.on('get-error-tracker', ({ data }) => {
		queryChannelErrorTracker(data)
			.then(results => settings_io.emit('send-error-tracker', results.map(x => ({
				channel_id: x.channel_id,
				service_tag: x.service_tag,
				meta_data: x.meta_data,
				error: x.error,
			}))))
			.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
	});

	settingsSocket.on('disconnect', () => {
		console.log({ message: 'disconnected settings service server', timestamp: new Date().toLocaleTimeString() });
	});

	return connect();
}

(async () => {
	await init();

	setInterval(_ => console.log({ ticker: `updates: ${UPDATE_TICK_MS}ms`, timestamp: new Date().toLocaleTimeString() }), UPDATE_TICK_MS);
	console.log({ message: 'init', timestamp: new Date().toLocaleTimeString() });
})();