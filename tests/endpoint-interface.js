
/*

*/

"use strict";

const fetch = require('node-fetch');
const JsonFile = require('../source/utils/json-file');

const rooturl = new JsonFile('./settings/rooturl.json', {
    database: 'https://database.notfound.api',
    wallet: 'https://wallet.notfound.api'
});

function WalletEndpoint() {
    throw new Error("WalletEndpoint [constructor] not implemented");
}
WalletEndpoint.prototype.endpoints = function () {
    throw new Error("WalletEndpoint [endpoints] not implemented");
}

WalletEndpoint.prototype.makeRequest = async function (endpoint, data) {
    throw new Error("WalletEndpoint [makeRequest] not implemented");
}

function DatabaseEndpoint() {
    this.baseUrl = rooturl.data.database;
    
    const sql_db_auth = new JsonFile(`./settings/sql_db_auth.json`, {
        url: '',
        client_id: '',
        client_secret: '',
        audience: ''
    });

    const db_endpoints = new JsonFile('./settings/db_endpoints.json', {
        insertuser: '/insertuser',
        withdraw: '/withdraw',
        getrainedusers: '/getrainedusers',
        rain: '/rain',
        getuser: '/getuser',
        subticker: '/subticker',
        bitcorn: '/bitcorn'
    });
    this.auth = sql_db_auth.data;
    this.paths = db_endpoints.data;
}

DatabaseEndpoint.prototype.makeRequest = async function (endpoint, data) {
    const { access_token } = await _fetchToken(this.auth);
    return _makeRequest(`${this.baseUrl}${endpoint}`, access_token, data);
}
/*
DatabaseEndpoint.prototype.insertuserRequest = async function (twitchId, twitchUsername) {
    return this.makeRequest(`${this.paths.insertuser}`, [{
        twitchId,
        twitchUsername
    }]);
}
*/

/*
DatabaseEndpoint.prototype.getuserRequest = async function (twitchId, twitchUsername) {
    return this.makeRequest(`${this.paths.getuser}`, [{
        twitchId,
        twitchUsername
    }]);
}
*/

/*
DatabaseEndpoint.prototype.getrainedusersRequest = async function (twitchId, twitchUsername) {
    return this.makeRequest(`${this.paths.getrainedusers}`, [{
        twitchId,
        twitchUsername
    }]);
}
*/
DatabaseEndpoint.prototype.bitcornRequest = async function (twitchId, twitchUsername) {
    return this.makeRequest(`${this.paths.bitcorn}`, {
        twitchId,
        twitchUsername
    });
}

DatabaseEndpoint.prototype.subtickerRequest = async function (twitchId, twitchUsername, amount) {
    return this.makeRequest(`${this.paths.subticker}`, {
        twitchId,
        twitchUsername,
        amount
    });
}

DatabaseEndpoint.prototype.tipcornRequest = async function (receiverId, receiverName, senderId, senderName, amount) {
    return this.makeRequest(`${this.paths.tipcorn}`, {
        receiverId,
        receiverName,
        senderId,
        senderName,
        amount
    });
}

DatabaseEndpoint.prototype.rainRequest = async function (recipients, senderId, senderName, senderAmount) {
    //recipients = [recipient = { id: '', name: '', amount: 0 }]
    return this.makeRequest(`${this.paths.rain}`, {
        recipients,
        senderId,
        senderName,
        senderAmount
    });
}

async function _fetchToken(client_credentials) {
    return fetch(client_credentials.url, {
        method: 'POST',
        header: {
            'content-type': 'application/json'
        },
        body: new URLSearchParams({
            client_id: client_credentials.client_id,
            client_secret: client_credentials.client_secret,
            audience: client_credentials.audience,
            grant_type: 'client_credentials'
        })
    }).then(res => res.json()).catch(e => e);
}

async function _makeRequest(url, access_token, data) {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(data)
    }).then(res => res.json()).catch(e => e);
};

module.exports = new DatabaseEndpoint();
