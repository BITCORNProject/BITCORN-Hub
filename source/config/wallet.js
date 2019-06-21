/*

*/

"use strict";

const fetch = require('node-fetch');

const walletSettings = require('../../settings/wallet-settings');
const { Timer } = require('../../public/js/server/timer');

const { Queue } = require('../../public/js/server/queue');

const walletQueue = {
    items: new Queue(),
    isBusy: false
};

async function processQueue() {
    if (walletQueue.isBusy === true) return;
    if (walletQueue.items.size() === 0) return;

    walletQueue.isBusy = true;

    console.log(`Starting dequeue ${walletQueue.items.size()} items`);

    const timer = new Timer();
    timer.start();

    const result = await walletQueue.items.dequeue();
    result.time = timer.stop();

    console.log(result);

    await new Promise(resolve => setTimeout(resolve, 1000 * 2));
    walletQueue.isBusy = false;
    processQueue();
}

function Wallet() { }

Wallet.prototype.enqueueItem = function (item) {
    walletQueue.items.enqueue(item);
    console.log(`Equeue wallet ${walletQueue.items.size()} items`);
    processQueue();
}

Wallet.prototype.makeRequest = async function (method, params) {
    const { url, username, password } = walletSettings.data;
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
        },
        body: JSON.stringify({
            "method": method,
            "params": params || []
        })
    };
    const result = await fetch(url, options);
    const json = await result.json();
    return { json };
}

Wallet.prototype.queueBusy = function () { return walletQueue.isBusy; }
Wallet.prototype.queueCount = function () { return walletQueue.items.size(); }

module.exports = new Wallet();