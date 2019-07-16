
/*

*/

"use strict";
const fs = require('fs');
const assert = require('assert');
const fetch = require('node-fetch');

const walletSettings = require('../settings/wallet-settings');
const wallet = require('../source/config/wallet');
const mysql = require('../source/config/databases/mysql');
const math = require('../source/utils/math');
const kraken = require('../source/config/authorize/kraken');
const helix = require('../source/config/authorize/helix');

const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {

        const result = await fetch('https://bitcorn-role-sync.azurewebsites.net/tx', { 
            method: 'POST', 
            body:  new URLSearchParams({id: 726377745, name: 'bitcornhub', comment: 'Testing endpoint'})
        });
        
        console.log(await result.text());

        console.log(result);
        assert(result);
    } catch (error) {
        console.error(error);
    }
})();