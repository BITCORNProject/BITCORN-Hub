
/*
request_result1.refused
*/

"use strict";

const apiRequest = require('./api-request');

const rooturl = require('../../settings/rooturl.json');
const sql_db_auth = require(`../../settings/sql_db_auth.json`);
const db_endpoints = require('../../settings/db_endpoints.json');

function DatabaseEndpoint() {

    this.MAX_WALLET_AMOUNT = 100000000000;
    this.MAX_RAIN_USERS = 10;

    this.sql_db_auth = sql_db_auth;
    this.db_endpoints = db_endpoints;
	
    this.paymentCode = {
        Banned: -7,
        InternalServerError: -6,
        InvalidPaymentAmount: -5,
        DatabaseSaveFailure: -4,
        NoRecipients: -3,
        InsufficientFunds: -2,
        QueryFailure: -1,
        Success: 1
    };

    this.walletCode = {
        TransactionTooLarge: -5,
        InsufficientFunds: -4,
        QueryFailure: -3,
        InternalServerError: -2,
        WalletError: -1,
        Success: 1
    };

    this.banResultCode = {
        Invalid: -2,
        Unauthorized: -1,
        Success: 1,
        AlreadyBanned: 2
    };
}

DatabaseEndpoint.prototype.rooturl = function() {
	return rooturl;
}

// v3
DatabaseEndpoint.prototype.makeErrorRequest = async function (data) {
	const { access_token } = await apiRequest.getCachedToken(this.sql_db_auth);
	const url = `${rooturl.base}/${rooturl.errorlog}`;
    return apiRequest.makeRequest(url, access_token, data);
}

DatabaseEndpoint.prototype.makeRequestBase = async function (baseUrl, endpoint, data) {
	const { access_token } = await apiRequest.getCachedToken(this.sql_db_auth);
	const url = `${rooturl.base}/${baseUrl}${endpoint}`;
    return apiRequest.makeRequest(url, access_token, data);
}

DatabaseEndpoint.prototype.makeRequestDirect = async function (baseUrl, twitchId, data) {
    const { access_token } = await apiRequest.getCachedToken(this.sql_db_auth);
	const url = `${rooturl.base}/${baseUrl}`;
    return apiRequest.makeRequest(url, twitchId, access_token, data);
}

DatabaseEndpoint.prototype.criticalRequestDirect = async function (baseUrl, twitchId, data) {
    const { access_token } = await apiRequest.getCachedToken(this.sql_db_auth);
	const url = `${rooturl.base}/${baseUrl}`;
    return apiRequest.criticalRequest(url, twitchId, access_token, data);
}

DatabaseEndpoint.prototype.criticalRequestBase = async function (baseUrl, endpoint, twitchId, data) {
    const { access_token } = await apiRequest.getCachedToken(this.sql_db_auth);
	const url = `${rooturl.base}/${baseUrl}${endpoint}`;
    return apiRequest.criticalRequest(url, twitchId, access_token, data);
}

DatabaseEndpoint.prototype.makeRequest = async function (endpoint, data) {
    return this.makeRequestBase(rooturl.transaction, endpoint, data);
}

DatabaseEndpoint.prototype.criticalRequest = async function (endpoint, twitchId, data) {
    return this.criticalRequestBase(rooturl.transaction, endpoint, twitchId, data);
}

DatabaseEndpoint.prototype.makeRequestTest = async function (endpoint, data) {
    return this.makeRequestBase(rooturl.test, endpoint, data);
}

DatabaseEndpoint.prototype.makeRequestUser = async function (endpoint, data) {
    return this.makeRequestBase(rooturl.user, endpoint, data);
}

DatabaseEndpoint.prototype.criticalRequestTest = async function (endpoint, twitchId, data) {
    return this.criticalRequestBase(rooturl.test, endpoint, twitchId, data);
}

DatabaseEndpoint.prototype.criticalRequestWallet = async function (twitchId, data) {
    return this.criticalRequestDirect(rooturl.wallet, twitchId, data);
}

DatabaseEndpoint.prototype.tokenRequest = async function (token, twitchId, twitchUsername) {
    return this.makeRequest(`${this.db_endpoints.token}`, {
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
    return this._criticalArbitraryRequest(`${this.db_endpoints.bitcorn}`, twitchId, {
        id: twitchId
    });
}

/*
Expect code: this.walletCode
*/
DatabaseEndpoint.prototype.withdrawRequest = async function (twitchId, amount, cornaddy) {
    return this._criticalArbitraryRequest(`${this.db_endpoints.withdraw}`, twitchId, {
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
    return this._criticalRecipientsRequest(`${this.db_endpoints.rain}`, recipients, twitchId);
}

/*
Expect code: this.paymentCode
*/
DatabaseEndpoint.prototype.tipcornRequest = async function (senderId, receiverId, amount) {
    return this._criticalArbitraryRequest(`${this.db_endpoints.tipcorn}`, senderId, {
        senderId,
        receiverId,
        amount
    });
}

/*
Expect code: this.paymentCode
*/
DatabaseEndpoint.prototype.subtickerRequest = async function (recipients, twitchId) {
    return this._criticalRecipientsRequest(`${this.db_endpoints.subticker}`, recipients, twitchId);
}

/*
Expect code: this.banResultCode
*/
DatabaseEndpoint.prototype.blacklistRequest = async function (senderId, receiverTwitchId) {
    return this._criticalArbitraryRequest(`${this.db_endpoints.blacklist}`, senderId, { senderId, receiverTwitchId });
}

/*
Expect id: generated from database insert
*/
DatabaseEndpoint.prototype.errorlogRequest = async function (sendData) {
    return null;
}


// v3
/*

// rain
const body = {
	from: `twitch|120524051`,
	to: [
		`twitch|75987197`,
		`twitch|${user.id}`
	],
	platform: 'twitch',
	amount: amount,
	columns: ['balance', 'twitchusername']
};

// tipcorn
const body = {
	from: `twitch|120524051`,
	to: `twitch|75987197`,
	platform: 'twitch',
	amount: amount,
	columns: ['balance', 'twitchusername']
};
const res = [ { from: {userid, ...columns}, to: {userid, ...columns}, txId: 1780 } ]

// bitcorn 
const body = null;

// withdraw
const body = {
	id: 'twitch|75987197',
	cornaddy: 'CSLmffdJ9vgbykNLZbCwyPp1VDDgBhY8xv',
	amount: 100,
	columns: ['balance', 'tipped']
};

*/
DatabaseEndpoint.prototype.request = function(twitchId, body) {
	return {
		rain: () => this._criticalArbitraryRequest(this.db_endpoints.rain, twitchId, body),
		tipcorn: () => this._criticalArbitraryRequest(this.db_endpoints.tipcorn,  twitchId, body),
		bitcorn: () => this.makeRequestUser(`${this.db_endpoints.bitcorn}${twitchId}`, null),
		withdraw: () => this.criticalRequestDirect(rooturl.wallet, twitchId, body)
	};
}

// v3
/*
const body = {chatters: [ids], minutes: 1.5}
*/
DatabaseEndpoint.prototype.requestPayout = function(body) {
	return this.makeRequest(this.db_endpoints.subticker, body);
}

// v3
/*
const body = null;
*/
DatabaseEndpoint.prototype.requestBlacklist = async function (twitchId, banUserId) {
    return this.makeRequestUser(`${this.db_endpoints.blacklist}`, {Sender: `twitch|${twitchId}`, BanUser: `twitch|${banUserId}`});
}

// v3
/*
  makeErrorRequest() above
*/

module.exports = new DatabaseEndpoint();
