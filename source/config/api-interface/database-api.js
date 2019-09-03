
/*
request_result1.refused
*/

"use strict";

const rooturl = require('./rooturl');
const apiRequest = require('./api-request');
const JsonFile = require('../../utils/json-file');

function DatabaseEndpoint() {

    this.MAX_WALLET_AMOUNT = 100000000000;
    this.MAX_RAIN_USERS = 10;

    this.sql_db_auth = new JsonFile(`./settings/sql_db_auth.json`, {
        url: '',
        client_id: '',
        client_secret: '',
        audience: ''
    });

    this.db_endpoints = new JsonFile('./settings/db_endpoints.json', {
        bitcorn: '/getuser',
        rain: '/rain',
        subticker: '/payout',
        tipcorn: '/tipcorn',
        withdraw: '/withdraw',
        token: '/token',
        errorlog: '/boterror'
    });

    this.paymentCode = {
        Banned: -7,
        InternalServerError: -6,
        InvalidPaymentAmount: -5,
        DatabaseSaveFailure: -4,
        NoRecipients: -3,
        InsufficientFunds: -2,
        QueryFailure: -1,
        Success: 1
    }

    this.walletCode = {
        TransactionTooLarge: -5,
        InsufficientFunds: -4,
        QueryFailure: -3,
        InternalServerError: -2,
        WalletError: -1,
        Success: 1
    }
}

DatabaseEndpoint.prototype.makeRequestBase = async function (baseUrl, endpoint, data) {
    const { access_token } = await apiRequest.fetchToken(this.sql_db_auth.getValues());
    return apiRequest.makeRequest(`${baseUrl}${endpoint}`, access_token, data);
}

DatabaseEndpoint.prototype.criticalRequestBase = async function (baseUrl, endpoint, twitchId, data) {
    const { access_token } = await apiRequest.fetchToken(this.sql_db_auth.getValues());
    return apiRequest.criticalRequest(`${baseUrl}${endpoint}`, twitchId, access_token, data);
}

DatabaseEndpoint.prototype.makeRequest = async function (endpoint, data) {
    return this.makeRequestBase(rooturl.getValues().database, endpoint, data);
}

DatabaseEndpoint.prototype.criticalRequest = async function (endpoint, twitchId, data) {
    return this.criticalRequestBase(rooturl.getValues().database, endpoint, twitchId, data);
}

DatabaseEndpoint.prototype.makeRequestTest = async function (endpoint, data) {
    return this.makeRequestBase(rooturl.getValues().test, endpoint, data);
}

DatabaseEndpoint.prototype.criticalRequestTest = async function (endpoint, twitchId, data) {
    return this.criticalRequestBase(rooturl.getValues().test, endpoint, twitchId, data);
}

// Change to critical
DatabaseEndpoint.prototype.getuserRequest = async function (twitchId, twitchUsername) {
    return this.makeRequest(`${this.db_endpoints.getValues().getuser}`, {
        twitchId, // change to id needed
        twitchUsername //remove
    });
}

DatabaseEndpoint.prototype.tokenRequest = async function (token, twitchId, twitchUsername) {
    return this.makeRequest(`${this.db_endpoints.getValues().token}`, {
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
DatabaseEndpoint.prototype._criticalRecipientsRequest = async function (path, recipients, twitchId) {
    //recipients = [recipient = { twitchId: '', twitchUsername: '', amount: 0 }]
    return this._criticalArbitraryRequest(`${path}`, twitchId, {
        recipients,
        id: twitchId
    });
}

DatabaseEndpoint.prototype._criticalRecipientsRequestIdUsername = async function (path, recipients, twitchId, twitchUsername) {
    //recipients = [recipient = { twitchId: '', twitchUsername: '', amount: 0 }]
    return this._criticalArbitraryRequest(`${path}`, twitchId, {
        recipients,
        id: twitchId,
        username: twitchUsername
    });
}

// With arbitrary body data
DatabaseEndpoint.prototype.bitcornRequest = async function (twitchId) {
    return this._criticalArbitraryRequest(`${this.db_endpoints.getValues().bitcorn}`, twitchId, {
        id: twitchId
    });
}

/*
Expect code: this.walletCode
*/
DatabaseEndpoint.prototype.withdrawRequest = async function (twitchId, amount, cornaddy) {
    return this._criticalArbitraryRequest(`${this.db_endpoints.getValues().withdraw}`, twitchId, {
        id: twitchId,
        amount,
        cornaddy
    });
}

// With recipients
/*
Expect code: this.paymentCode
*/
DatabaseEndpoint.prototype.rainRequest = async function (recipients, twitchId) {
    return this._criticalRecipientsRequest(`${this.db_endpoints.getValues().rain}`, recipients, twitchId);
}

/*
Expect code: this.paymentCode
*/
DatabaseEndpoint.prototype.tipcornRequest = async function (senderId, receiverId, amount) {
    return this._criticalArbitraryRequest(`${this.db_endpoints.getValues().tipcorn}`, senderId, {
        senderId,
        receiverId,
        amount
    });
}

/*
Expect code: this.paymentCode
*/
DatabaseEndpoint.prototype.subtickerRequest = async function (recipients, twitchId) {
    return this._criticalRecipientsRequest(`${this.db_endpoints.getValues().subticker}`, recipients, twitchId);
}

/*
Expect id: generated from database insert
*/
DatabaseEndpoint.prototype.errorlogRequest = async function (sendData) {
    return this.makeRequest(`${this.db_endpoints.getValues().errorlog}`, sendData); 
}

module.exports = new DatabaseEndpoint();
