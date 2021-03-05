/*

*/

"use strict";

const { Queue } = require('../public/js/server/queue');
const { Ticker } = require('../public/js/server/ticker');
const { Timer } = require('../public/js/server/timer');
const Time = require('../src/utils/time');

function chunk(array, size) {
    const chunked_arr = [];
    let index = 0;
    while (index < array.length) {
        chunked_arr.push(array.slice(index, size + index));
        index += size;
    }
    return chunked_arr;
}

module.exports = {
    fs: require('fs'),
    assert: require('assert'),
    fetch: require('node-fetch'),
    math: require('../src/utils/math'),
    tmi: require('../source/config/tmi'),
    helix: require('../src/helix'),
    rooturl: require('../source/config/api-interface/rooturl'),
    apiRequest: require('../source/config/api-interface/api-request'),
    databaseApi: require('../source/config/api-interface/database-api'),
    JsonFile: require('../src/utils/json-file'),
    errorLogger: require('../src/utils/error-logger'),
	tmiCommands: require('../source/tmi-commands'),
	cmdHelper: require('../source/commands/cmd-helper'),
	WebSocket: require('ws'),
    Ticker: Ticker,
    Timer: Timer,
    Queue: Queue,
    Time: Time
};
