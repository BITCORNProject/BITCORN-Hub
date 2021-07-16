/*

*/

"use strict";

require('dotenv').config({ path: __dirname + './../.env' });

const { MongoClient } = require('mongodb');

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

module.exports = {
	connect: async () => client.connect(),
	createOrUpdateActivityTracker,
	queryChannelActivityTracker,
	insertTransactionTracker,
	queryChannelTransactionTracker,
	insertErrorTracker,
	queryChannelErrorTracker
};