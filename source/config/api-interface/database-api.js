
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
        bitcorn: '/twitch|', // tested
        rain: '/rain', // tested
        subticker: '/payout', // tested
        tipcorn: '/tipcorn', // tested
        withdraw: '/withdraw', // tested
        token: '/token',
		blacklist: '/ban/twitch|' // tested
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
	return rooturl.getValues();
}

// v3
DatabaseEndpoint.prototype.makeErrorRequest = async function (data) {
	const { access_token } = await apiRequest.getCachedToken(this.sql_db_auth.getValues());
	const url = `${rooturl.getValues().base}/${rooturl.getValues().errorlog}`;
    return apiRequest.makeRequest(url, access_token, data);
}

DatabaseEndpoint.prototype.makeRequestBase = async function (baseUrl, endpoint, data) {
	const { access_token } = await apiRequest.getCachedToken(this.sql_db_auth.getValues());
	const url = `${rooturl.getValues().base}/${baseUrl}${endpoint}`;
    return apiRequest.makeRequest(url, access_token, data);
}

DatabaseEndpoint.prototype.makeRequestDirect = async function (baseUrl, twitchId, data) {
    const { access_token } = await apiRequest.getCachedToken(this.sql_db_auth.getValues());
	const url = `${rooturl.getValues().base}/${baseUrl}`;
    return apiRequest.makeRequest(url, twitchId, access_token, data);
}

DatabaseEndpoint.prototype.criticalRequestDirect = async function (baseUrl, twitchId, data) {
    const { access_token } = await apiRequest.getCachedToken(this.sql_db_auth.getValues());
	const url = `${rooturl.getValues().base}/${baseUrl}`;
    return apiRequest.criticalRequest(url, twitchId, access_token, data);
}

DatabaseEndpoint.prototype.criticalRequestBase = async function (baseUrl, endpoint, twitchId, data) {
    const { access_token } = await apiRequest.getCachedToken(this.sql_db_auth.getValues());
	const url = `${rooturl.getValues().base}/${baseUrl}${endpoint}`;
    return apiRequest.criticalRequest(url, twitchId, access_token, data);
}

DatabaseEndpoint.prototype.makeRequest = async function (endpoint, data) {
    return this.makeRequestBase(rooturl.getValues().transaction, endpoint, data);
}

DatabaseEndpoint.prototype.criticalRequest = async function (endpoint, twitchId, data) {
    return this.criticalRequestBase(rooturl.getValues().transaction, endpoint, twitchId, data);
}

DatabaseEndpoint.prototype.makeRequestTest = async function (endpoint, data) {
    return this.makeRequestBase(rooturl.getValues().test, endpoint, data);
}

DatabaseEndpoint.prototype.makeRequestUser = async function (endpoint, data) {
    return this.makeRequestBase(rooturl.getValues().user, endpoint, data);
}

DatabaseEndpoint.prototype.criticalRequestTest = async function (endpoint, twitchId, data) {
    return this.criticalRequestBase(rooturl.getValues().test, endpoint, twitchId, data);
}

DatabaseEndpoint.prototype.criticalRequestWallet = async function (twitchId, data) {
    return this.criticalRequestDirect(rooturl.getValues().wallet, twitchId, data);
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
Expect code: this.banResultCode
*/
DatabaseEndpoint.prototype.blacklistRequest = async function (senderId, receiverTwitchId) {
    return this._criticalArbitraryRequest(`${this.db_endpoints.getValues().blacklist}`, senderId, { senderId, receiverTwitchId });
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
		rain: () => this._criticalArbitraryRequest(this.db_endpoints.getValues().rain, twitchId, body),
		tipcorn: () => this._criticalArbitraryRequest(this.db_endpoints.getValues().tipcorn,  twitchId, body),
		bitcorn: () => this.makeRequestUser(`${this.db_endpoints.getValues().bitcorn}${twitchId}`, null),
		withdraw: () => this.criticalRequestDirect(rooturl.getValues().wallet, twitchId, body)
	};
}

// v3
/*
const body = ['75987197', user.id, '120524051'];
*/
DatabaseEndpoint.prototype.requestPayout = function(body) {
	return this.makeRequest(this.db_endpoints.getValues().subticker, body)
}

// v3
/*
const body = null;
*/
DatabaseEndpoint.prototype.requestBlacklist = async function (twitchId) {
    return this.makeRequestUser(`${this.db_endpoints.getValues().blacklist}${twitchId}`, null);
}

// v3
/*
  makeErrorRequest() above
*/

module.exports = new DatabaseEndpoint();
