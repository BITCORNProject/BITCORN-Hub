"use strict";
require('dotenv').config();

const fetch = require('node-fetch');

const { is_production } = require('../../prod');

const rooturl = require('../../settings/rooturl.json');

function getBasePath() {
	if(is_production) {
		return rooturl['twitch-api'].production;
	} else {
		return rooturl['twitch-api'].production;
	}
}

function getUrl(end_point) {
	return `${getBasePath()}/${end_point}`
}

function getAuthorizeOptions(data) {
	return {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Basic ' + (Buffer.from(process.env.HELIX_CLIENT_ID + ':' + process.env.HELIX_CLIENT_SECRET).toString('base64'))
		},
		body: JSON.stringify(data)
	};
}

async function getUserColumns(username, columns) {
	console.log(getUrl('user'));
	return fetch(getUrl('user'), getAuthorizeOptions({
		username: username,
		columns: columns
	})).then(res => res.json());
}

async function getUsersColumns(usernames, columns) {
	return fetch(getUrl('users'), getAuthorizeOptions({
		user_logins: usernames,
		columns: columns
	})).then(res => res.json());
}

async function getUserId(username) {
	return getUserColumns(username, ['id']);
}

async function getUsersId(usernames) {
	return getUsersColumns(usernames, ['id']);
}

module.exports = {
	getUserId,
	getUsersId,
	getUserColumns,
	getUsersColumns
}