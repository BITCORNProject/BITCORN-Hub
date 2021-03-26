/*

*/

"use strict";

require('dotenv').config({ path: __dirname + './../.env' });

const { MongoClient } = require('mongodb');
const io_client = require('socket.io-client');

const DB_NAME = 'activity-tracker';

/**
 * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
 * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
 */
const uri = "mongodb://localhost:27017/?retryWrites=true&w=majority";
// Create a new MongoClient
const client = new MongoClient(uri, {
	useUnifiedTopology: true,
});
/*
const activity = { channel: 'name', username: 'name', timestamp: 635456452456454 };
async function run() {
	try {
		// Connect the client to the server
		await client.connect();
		// // Establish and verify connection
		// await client.db("admin").command({ ping: 1 });
		// console.log("Connected successfully to server");

		const JsonFile = require('../_api-shared/json-file');
		const activityTracker = new JsonFile(__dirname + './../settings/activity-tracker.json', {});

		const tracker = activityTracker.data['#callowcreation'];
		console.log({ tracker });

		const dbo = client.db(DB_NAME);

		const channel_id = '75987197';
		for (let i = 0; i < tracker.length; i++) {
			const user = tracker[i];
			if (!user) continue;

			await createOrUpdate(channel_id, user.id);
		}

		const limit_amount = 10;

		const mysort = { timestamp: -1 };
		const findResult = await dbo.collection(channel_id)
			.find()
			.sort(mysort)
			.limit(limit_amount)
			.toArray();

		console.log({ findResult });
	} finally {
		// Ensures that the client will close when you finish/error
		await client.close();
	}
}
run().catch(console.dir);
*/

async function connect() {
	return client.connect();
}

async function createOrUpdate({ channel_id, user_id, username }) {
	return client.db(DB_NAME).collection(channel_id)
		.updateOne({ user_id }, { $set: { username, timestamp: Date.now() } }, { upsert: true })
		.catch(e => console.log(e));
}

async function queryChannel({ channel_id, limit_amount }) {
	const mysort = { timestamp: -1 };
	return client.db(DB_NAME).collection(channel_id)
		.find()
		.sort(mysort)
		.limit(limit_amount)
		.toArray();
}

async function init() {
	const settings_io = io_client(`ws://localhost:${process.env.SETTINGS_SERVER_PORT}`, {
		reconnection: true
	});
	const settingsSocket = settings_io.connect();

	settingsSocket.on('error', e => {
		console.log(`error settings service server id: ${settingsSocket.id}`, e);
	});

	settingsSocket.on('connect', () => {
		console.log(`connected to settings service server id: ${settingsSocket.id}`);
	});

	settingsSocket.on('set-activity-tracker', async ({ data }) => {
		console.log(data);
		const results = await createOrUpdate(data);
		console.log({ results });
	});

	settingsSocket.on('get-activity-tracker', async req => {
		const obj = { channel_id: req.channel_id, limit_amount: req.limit_amount };
		console.log(obj);
		const results = await queryChannel(obj);
		console.log({ results });

		settingsSocket.emit('chat-activity-tracker', results);
	});

	settingsSocket.on('disconnect', () => {
		console.log('disconnected settings service server');
	});

	await connect();
}

(async () => {
	await init();

	setInterval(_ => console.log('updates'), 1000 * 60);
	console.log('init');
})();