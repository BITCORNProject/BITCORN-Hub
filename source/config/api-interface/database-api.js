
/*
request_result1.refused
*/

"use strict";

const rooturl = require('./rooturl');
const apiRequest = require('./api-request');
const JsonFile = require('../../utils/json-file');

function DatabaseEndpoint() {

    const sql_db_auth = new JsonFile(`./settings/sql_db_auth.json`, {
        url: '',
        client_id: '',
        client_secret: '',
        audience: ''
    });

    const db_endpoints = new JsonFile('./settings/db_endpoints.json', {
        bitcorn: '/insertuser',
        getuser: '/getuser',
        rain: '/rain',
        subticker: '/payout',
        tipcorn: '/tipcorn',
        withdraw: '/withdraw',
        token: '/token'
    });

    this.auth = sql_db_auth.data;
    this.paths = db_endpoints.data;

    this.paymentCode = {
        InternalServerError: -6,
        InvalidPaymentAmount: -5,
        DatabaseSaveFailure: -4,
        NoRecipients: -3,
        InsufficientFunds: -2,
        QueryFailure: -1,
        Success: 1
    }
}

// rain tipcorn sub-ticker
DatabaseEndpoint.prototype.PaymentCode = function () {
    return [
        { name: 'InternalServerError', code: -6 },
        { name: 'InvalidPaymentAmount', code: -5 },
        { name: 'DatabaseSaveFailure', code: -4 },
        { name: 'NoRecipients', code: -3 },
        { name: 'InsufficientFunds', code: -2 },// if InsufficientFunds(-2) amount received is the user's current balance from the database
        { name: 'QueryFailure', code: -1 },
        { name: 'Success', code: 1 }
    ]
}

// bitcorn withdraw
DatabaseEndpoint.prototype.WalletCode = function () {
    return [
        { name: 'InternalServerError', code: -2 },
        { name: 'WalletError', code: -1 },
        { name: 'Success', code: 1 }
    ];
}

DatabaseEndpoint.prototype.makeRequest = async function (endpoint, data) {
    const { access_token } = await apiRequest.fetchToken(this.auth);
    const baseUrl = rooturl.getValues().database;
    return apiRequest.makeRequest(`${baseUrl}${endpoint}`, access_token, data);
}

DatabaseEndpoint.prototype.criticalRequest = async function (endpoint, twitchId, data) {
    const { access_token } = await apiRequest.fetchToken(this.auth);
    const baseUrl = rooturl.getValues().database;
    return apiRequest.criticalRequest(`${baseUrl}${endpoint}`, twitchId, access_token, data);
}

DatabaseEndpoint.prototype.getuserRequest = async function (twitchId, twitchUsername) {
    return this.makeRequest(`${this.paths.getuser}`, {
        twitchId,
        twitchUsername
    });
}

DatabaseEndpoint.prototype.tokenRequest = async function (token, twitchId, twitchUsername) {
    return this.makeRequest(`${this.paths.token}`, {
        twitchId,
        twitchUsername,
        token
    });
}

/*
    Critical with arbitrary body data
*/
DatabaseEndpoint.prototype._criticalArbitraryRequest = async function (path, twitchId, data) {
    return this.criticalRequest(`${path}`, twitchId, data);
}

/*
    Critical with recipients
*/
DatabaseEndpoint.prototype._criticalRecipientsRequest = async function (path, recipients, twitchId, twitchUsername) {
    //recipients = [recipient = { twitchId: '', twitchUsername: '', amount: 0 }]
    return this._criticalArbitraryRequest(`${path}`, twitchId, {
        recipients,
        twitchId,
        twitchUsername
    });
}

// With arbitrary body data
DatabaseEndpoint.prototype.bitcornRequest = async function (twitchId, twitchUsername) {
    return this._criticalArbitraryRequest(`${this.paths.bitcorn}`, twitchId, {
        twitchId,
        twitchUsername
    });
}

DatabaseEndpoint.prototype.withdrawRequest = async function (twitchId, twitchUsername, amount, cornaddy) {
    return this._criticalArbitraryRequest(`${this.paths.withdraw}`, twitchId, {
        twitchId,
        twitchUsername,
        amount,
        cornaddy
    });
}

// With recipients

DatabaseEndpoint.prototype.rainRequest = async function (recipients, twitchId, twitchUsername) {
    return this._criticalRecipientsRequest(`${this.paths.rain}`, recipients, twitchId, twitchUsername);
}

DatabaseEndpoint.prototype.tipcornRequest = async function (senderId, senderName, receiverId, receiverName, amount) {
    return this._criticalArbitraryRequest(`${this.paths.tipcorn}`, senderId, {
        senderId,
        senderName,
        receiverId,
        receiverName,
        amount
    });
}

DatabaseEndpoint.prototype.subtickerRequest = async function (recipients, twitchId, twitchUsername) {
    return this._criticalRecipientsRequest(`${this.paths.subticker}`, recipients, twitchId, twitchUsername);
}

module.exports = new DatabaseEndpoint();
