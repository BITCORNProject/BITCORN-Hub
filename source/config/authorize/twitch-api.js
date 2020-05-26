/*

*/

"use strict";

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const crypto = require('crypto');
const auth = require('../../../settings/auth');

function Authenticated() {
    this.access_token = '';
    this.token_type = '';
    this.scope = '';
    this.expires_in = 0;
    this.refresh_token = '';
    this.id_token = '';
}

function AppOptions(path, client_id, client_secret, redirect_uri, scope) {
	this.path = path;
	this.client_id = client_id;
	this.client_secret = client_secret;
	this.redirect_uri = redirect_uri;
    this.scope = scope.join(' ');
    
	const buf = crypto.randomBytes(32);
	const state = buf.toString('hex');
	
	this.state = state;
}

AppOptions.prototype.authUrl = function() {
    const urlParams = [
        `client_id=${this.client_id}`,
        `redirect_uri=${encodeURIComponent(this.redirect_uri)}`,
        `response_type=code`,
        `scope=${encodeURIComponent(this.scope)}`,
        `state=${this.state}`
    ];

    const urlQuery = urlParams.join('&');

    return `${this.path}?${urlQuery}`;
};

function TwitchAPI(appOptions) {
	this.authenticated = new Authenticated();

	this.appOptions = appOptions;

	this.channel = {
		user_id: ''
	};
}

TwitchAPI.prototype.getAuthorizedOptions = function() {
    return {
        headers: {
            'Accept': 'application/vnd.twitchtv.v5+json',
            'Client-ID': this.appOptions.client_id,
            'Authorization': 'OAuth ' + this.authenticated.access_token,
            'Content-Type': 'application/json'
        }
    };
};

TwitchAPI.prototype.authenticateCode = async function ({code, state}) {
	throw new Error('Not Implemented');
};

TwitchAPI.prototype.keepAlive = async function() {

    const url = 'https://api.twitch.tv/kraken/oauth2/token';

    const form = {
        grant_type: 'refresh_token',
        refresh_token: this.authenticated.refresh_token,
        client_id: this.appOptions.client_id,
        client_secret: this.appOptions.client_secret,
    };

    const options = { method: 'POST', body: new URLSearchParams(form) };

    return fetch(url, options)
        .then(res => res.json())
		.then(this.setAuthenticated)
		.then(() => setTimeout(keepAlive, (this.authenticated.expires_in - 1000) * 1000))
        .catch(error => ({ error }));
}

TwitchAPI.prototype.setAuthenticated = async function(json) {
	if (json.error) throw json.error;
	for (const key in json) {
		if (this.authenticated.hasOwnProperty(key)) {
			this.authenticated[key] = json[key];
		}
	}
	return { error: null };
}

TwitchAPI.prototype.setChannel = async function () {
	throw new Error('Not Implemented');
}

TwitchAPI.prototype.getEndpoint = async function (url) {
    return fetch(url, this.getAuthorizedOptions())
		.then(res => res.json())
		.catch(error => { error });
}

module.exports = {
	AppOptions,
	TwitchAPI
};