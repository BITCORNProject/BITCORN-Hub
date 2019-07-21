
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

        const JsonFile = require('../source/utils/json-file');
        const wallet_auth = new JsonFile('./settings/wallet_auth.json', {
            url: '',
            client_credentials: {
                url: '',
                client_id: '',
                client_secret: '',
                audience: ''
            }
        });

        const token_result = await fetch(wallet_auth.data.client_credentials.url, { 
            method: 'POST', 
            header: {
                'content-type': 'application/json'
            },
            body: new URLSearchParams({
                client_id: wallet_auth.data.client_credentials.client_id,
                client_secret: wallet_auth.data.client_credentials.client_secret,
                audience: wallet_auth.data.client_credentials.audience,
                grant_type: 'client_credentials'
            })
        });

        const {access_token} = await token_result.json();
        
        const result = await fetch(wallet_auth.data.url, { 
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify({
                "method": 'getbalance',
                "params": ['testaccount']
            })
        });

        console.log(await result.json());

        assert(JsonFile);
    } catch (error) {
        console.error(error);
    }
})();