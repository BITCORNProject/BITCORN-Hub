"use strict";
require('dotenv').config();

const fetch = require('node-fetch');

async function getUser(username) {
	const url = `http://localhost:${process.env.PORT}/user`;
	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Basic ' + (Buffer.from(process.env.HELIX_CLIENT_ID + ':' + process.env.HELIX_CLIENT_SECRET).toString('base64'))
		},
		body: JSON.stringify({
			username: username,
			columns: ['id']
		})
	};

	console.log(process.env);
	const twitchResult = await fetch(url, options);
	return twitchResult.json();
}


module.exports = {
	getUser
}