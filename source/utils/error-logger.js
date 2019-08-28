/*

*/

"use strict";

const databaseAPI = require('../config/api-interface/database-api');

async function asyncThrowAndLogError(event, obj) {
    
    const message = obj.method(obj.params);
    
    const sendData = {
        twitchId: obj.params.twitchId,
        twitchUsername: obj.params.twitchUsername,
        command: event.configs.name,
    };
    
    const error = await asyncLogError(sendData, obj.params.code, message, JSON.stringify(event.__proto__));
    
    error.hasMessage = true;
    error.twitchUsername = obj.params.twitchUsername;

    throw error;
    
}

async function asyncLogError(sendData, errorcode, message, botData) {
    const error = new Error(message);

    sendData.errorcode = errorcode;
    sendData.errorMessage = error.message;
    sendData.stacktrace = error.stack;

    sendData.botData = botData;

    const error_log_result = await databaseAPI.errorlogRequest(sendData);

    error.logSuccess = error_log_result.id && error_log_result.id > 0;
    error.sendData = sendData;
    error.sendResponse = error_log_result;
    return error;
}

module.exports = {
    asyncLogError: asyncLogError,
    asyncThrowAndLogError: asyncThrowAndLogError
};