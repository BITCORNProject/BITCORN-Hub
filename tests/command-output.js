
/*

*/

"use strict";
const assert = require('assert');
const fetch = require('node-fetch');
const fs = require('fs');

const tmiCommands = require('../source/tmi-commands');

const wallet = require('../source/config/wallet');
const mysql = require('../source/config/databases/mysql');
const math = require('../source/utils/math');

const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {
        const file = 'command-configs.txt';
        const commands = tmiCommands.getCommands('$');

        fs.writeFileSync(file, '');
        commands.forEach((v, i) => {

            console.log('');
            console.log(`name:\t\t${v.configs.name}`);
            console.log(`example:\t${v.configs.example}`);
            console.log(`description:\t${v.configs.description}`);

            fs.appendFileSync(file, '\r');
            fs.appendFileSync(file, '\r');
            fs.appendFileSync(file, `name:\t\t\t${v.configs.name}\r`);
            fs.appendFileSync(file, `example:\t\t${v.configs.example}\r`);
            fs.appendFileSync(file, `description:\t${v.configs.description}`);
        });

        console.log(commands);

        assert(commands.size > 0);
    } catch (error) {
        console.error(error);
    }
})();

function chunk(array, size) {
    const chunked_arr = [];
    let index = 0;
    while (index < array.length) {
        chunked_arr.push(array.slice(index, size + index));
        index += size;
    }
    return chunked_arr;
}