/*

*/

'use strict';

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const math = require('../../utils/math');
const wallet = require('../../config/wallet');
const txMonitor = require('../../tx-monitor');

const Pending = require('../../utils/pending');

const pending = new Pending('withdraw');

module.exports = Object.create({
    configs: {
        name: 'withdraw',
        accessLevel: 'CHAT',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Withraw your funds off the bot :: Commands do not work in Direct Messages',
        example: '$withdraw <amount> <address>',
        prefix: '$',
        whisper: true
    },
    async execute(event) {

        if(pending.started(event, tmi)) return pending.reply(event, tmi);

        const fromusername = event.user.username;
        const withdraw_amount = +(event.args[0] ? event.args[0].replace('<','').replace('>','') : 0);
        // Do not .toLowerCase() the address is case sensitive
        const to_cornaddy = (event.args[1] ? event.args[1].replace('@', '').replace('<','').replace('>','') : '');
        
        if(withdraw_amount <= 0) {
            const reply = `@${event.user.username}, Cannot Withdraw Negative or Zero Amount`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }

        const from_result = await mysql.query(`SELECT * FROM users WHERE twitch_username = '${fromusername}'`);
        if(from_result.length === 0) {
            const reply = `@${event.user.username}, you must register to use the $tipcorn command (Register with: $reg)`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }
        const getbalance = await wallet.makeRequest('getbalance', [event.user.username]);
        
        const from_record = from_result[0];
        const from_info = {
            cornaddy: from_record.cornaddy,
            balance: math.fixed8(getbalance.json.result)
        }

        if(from_info.balance < withdraw_amount) {
            const reply = `@${event.user.username}, Insufficient Funds, Cannot Withdraw (Check Balance with: $bitcorn)`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }

        const to_info = {
            cornaddy: to_cornaddy,
            balance: math.fixed8(+withdraw_amount)
        }

        const { json } = await wallet.makeRequest('sendfrom', [
            fromusername,
            to_info.cornaddy,
            to_info.balance,
            0,
            `${fromusername} Withdrew To ${to_info.cornaddy}`,
            `${fromusername} Withdrew from ${from_info.cornaddy} To ${to_info.cornaddy}`
        ]);

        if(json.error) {
            const reply = `Transaction canceled ${event.configs.prefix}${event.configs.name}, @${event.user.username}, can not send wallet message: ${json.error.message}`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }

        txMonitor.monitorInsert({
            account: fromusername,
            amount: math.fixed8(withdraw_amount),
            txid: json.result,
            cornaddy: from_info.cornaddy,
            confirmations: '0',
            category: 'send',
            timereceived: mysql.timestamp(),
            comment: `${fromusername} Withdrew from ${from_info.cornaddy} To ${to_info.cornaddy}`
        });

        tmi.botWhisper(event.user.username, `@${event.user.username} Here is your withdraw receipt: [BITCORN TRANSACTION] :: Your Address: ${from_info.cornaddy} :: ${fromusername}'s Address: ${to_info.cornaddy} :: Amount Transacted: ${math.fixed8(withdraw_amount)} CORN :: Transaction ID: ${json.result} :: Explorer: https://explorer.bitcornproject.com/tx/${json.result}`);    

        await mysql.logit('Withdraw Executed', `Executed by ${event.user.username}`);

        return pending.complete(event);
    }
});