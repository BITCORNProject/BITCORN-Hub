/*

*/

"use strict";

require('dotenv').config({ path: __dirname + './../.env' });

const { MongoClient } = require('mongodb');
const io_client = require('socket.io-client');

// any abturary value is on this is like any loop ment to keep the program alive
const UPDATE_TICK_MS = 1000 * 60;

const ACTIVITY_TRACKER_DB_NAME = 'activity-tracker';
const TRANSACTION_TRACKER_DB_NAME = 'transaction-tracker';
const ERROR_TRACKER_DB_NAME = 'error-tracker';

/**
 * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
 * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
 */
const uri = "mongodb://localhost:27017/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
	useUnifiedTopology: true,
});

async function createOrUpdateActivityTracker({ channel_id, user_id, username }) {
	return client.db(ACTIVITY_TRACKER_DB_NAME).collection(channel_id)
		.updateOne({ user_id }, { $set: { username, timestamp: Date.now() } }, { upsert: true })
		.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
}

async function queryChannelActivityTracker({ channel_id, limit_amount }) {
	return client.db(ACTIVITY_TRACKER_DB_NAME).collection(channel_id)
		.find()
		.sort({ timestamp: -1 })
		.limit(limit_amount)
		.toArray()
		.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
}

async function insertTransactionTracker({ in_message, out_message, user_id, channel_id, success }) {
	return client.db(TRANSACTION_TRACKER_DB_NAME).collection(channel_id)
		.insertOne({ in_message, out_message, user_id, channel_id, success, timestamp: Date.now() })
		.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
}

async function queryChannelTransactionTracker({ channel_id, user_id, limit_amount }) {
	return client.db(TRANSACTION_TRACKER_DB_NAME).collection(channel_id)
		.find({ user_id })
		.sort({ timestamp: -1 })
		.limit(limit_amount)
		.toArray()
		.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
}

/**
 * @param {string} channel_id the channel id the error is associated with
 * @param {string} service_tag the tag identifying the service sending the error
 * @param {string} error a JSON.stringify error object
 * @param {string} meta_data any JSON.stringify extra data to be stored (can be null)
 */
async function insertErrorTracker({ channel_id, service_tag, error, meta_data }) {
	return client.db(ERROR_TRACKER_DB_NAME).collection(channel_id)
		.insertOne({ service_tag, error, timestamp: Date.now(), meta_data })
		.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
}

// TODO: send user the error id so we could look up the error by id
async function queryChannelErrorTracker({ channel_id, limit_amount }) {
	return client.db(ERROR_TRACKER_DB_NAME).collection(channel_id)
		.sort({ timestamp: -1 })
		.limit(limit_amount)
		.toArray()
		.catch(e => console.error({ e, timestamp: new Date().toLocaleTimeString() }));
}

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

	return client.connect();
}

(async () => {
	await init();

	setInterval(_ => console.log({ ticker: `updates: ${UPDATE_TICK_MS}ms`, timestamp: new Date().toLocaleTimeString() }), UPDATE_TICK_MS);
	console.log({ message: 'init', timestamp: new Date().toLocaleTimeString() });
})();