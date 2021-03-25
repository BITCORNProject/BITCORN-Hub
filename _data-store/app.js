/*

*/

"use strict";

const { MongoClient } = require('mongodb');



/**
 * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
 * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
 */
const uri = "mongodb://localhost:27017/?retryWrites=true&w=majority";
// Create a new MongoClient
const client = new MongoClient(uri, {
	useUnifiedTopology: true,
});

const activity = { channel: 'name', username: 'name', timestamp: 635456452456454 };

async function run() {
	try {
		// Connect the client to the server
		await client.connect();
		// // Establish and verify connection
		// await client.db("admin").command({ ping: 1 });
		// console.log("Connected successfully to server");

		const dbo = client.db("activity-tracker");
		const myquery = { username: 'naivebot' };
		const newvalues = { $set: { timestamp: Date.now() } };
		const result = await dbo.collection('callowcreation').updateOne(myquery, newvalues, { upsert: true });

		console.log({ result });

	} finally {
		// Ensures that the client will close when you finish/error
		await client.close();
	}



}
run().catch(console.dir);

