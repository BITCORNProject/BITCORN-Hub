/*

*/

"use strict";

const { Queue } = require('../public/js/server/queue');
const { Ticker } = require('../public/js/server/ticker');
const { Timer } = require('../public/js/server/timer');

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
    main: require('../main'),
    math: require('../source/utils/math'),
    tmi: require('../source/config/tmi'),
    kraken: require('../source/config/authorize/kraken'),
    helix: require('../source/config/authorize/helix'),
    rooturl: require('../source/config/api-interface/rooturl'),
    apiRequest: require('../source/config/api-interface/api-request'),
    databaseApi: require('../source/config/api-interface/database-api'),
    JsonFile: require('../source/utils/json-file'),
    tmiCommands: require('../source/tmi-commands'),
    Ticker: Ticker,
    Timer: Timer,
    Queue: Queue
};
