/*

*/

"use strict";

const databaseAPI = require('../../../_api-service/database-api');

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

// v3
/*

	
	sendData.timestamp = Date().now;
	sendData.application = 'bitcornhub-twitch'; // save as .env variable
	sendData.message = error.message;
	sendData.stacktrace = error.stack;
	

*/
async function asyncErrorLogger(error, errorcode) {
	const sendData = {
		timestamp: new Date(),
		application: 'bitcornhub-twitch', // save as .env variable
		message: error.message,
		stacktrace: error.stack,
		code: `${errorcode}`,
		id: 0
	};
    return databaseAPI.makeErrorRequest(sendData);
}

module.exports = {
    asyncErrorLogger: asyncErrorLogger, // v3
    asyncLogError: asyncLogError,
    asyncThrowAndLogError: asyncThrowAndLogError
};