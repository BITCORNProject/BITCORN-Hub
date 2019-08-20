/*

*/

"use strict";

async function throwAndLogError(event, obj, logRequest) {
    
    const message = obj.method(obj.params);
    
    const sendData = {
        twitchId: obj.params.twitchId,
        twitchUsername: obj.params.twitchUsername,
        command: event.configs.name,
    };
    
    const error = await logError(sendData, obj.params.code, message, JSON.stringify(event.__proto__), logRequest);
    
    error.hasMessage = true;
    error.twitchUsername = obj.params.twitchUsername;

    throw error;
    
}

async function logError(sendData, errorcode, message, botData, logRequest) {
    const error = new Error(message);

    sendData.errorcode = errorcode;
    sendData.errorMessage = error.message;
    sendData.stacktrace = error.stack;

    sendData.botData = botData;

    const error_log_result = await logRequest(sendData);

    error.logSuccess = error_log_result.sendResponse && error_log_result.sendResponse.id > 0;
    error.sendData = sendData;
    error.sendResponse = error_log_result;
    return error;
}