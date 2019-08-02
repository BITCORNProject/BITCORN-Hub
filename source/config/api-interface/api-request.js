
/*

*/

"use strict";

const fetch = require('node-fetch');

async function fetchToken(client_credentials) {

    const options = {
        method: 'POST',
        header: {
            'Content-Type': 'application/json'
        },
        body: new URLSearchParams({
            client_id: client_credentials.client_id,
            client_secret: client_credentials.client_secret,
            audience: client_credentials.audience,
            grant_type: 'client_credentials'
        })
    };

    return fetch(client_credentials.url, options)
        .then(res => res.json())
        .catch(e => e);
}

async function _request(url, twitchId, access_token, data) {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(data)
    };

    if(twitchId) options.headers.twitchId = twitchId;
    
    return fetch(url, options)
        .then(res => {
            if(res.status !== 200) return res;
            return res.json();
        })
        .catch(e => e);
}

async function makeRequest(url, access_token, data) {
    return _request(url, null, access_token, data);
}

async function criticalRequest(url, twitchId, access_token, data) {
    return _request(url, twitchId, access_token, data);
}

module.exports = {
    fetchToken,
    makeRequest,
    criticalRequest
};