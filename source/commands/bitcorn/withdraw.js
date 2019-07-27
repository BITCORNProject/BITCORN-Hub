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

        tmi.botSay(event.target, `@${event.user.username}, ${event.configs.prefix}${event.configs.name} system is currently under construction cttvDump System will return soon! cttvDump`);
        return { success: false, event };

        if(pending.started(event, tmi)) return pending.reply(event, tmi);

        const withdraw_amount = +(event.args[0] ? event.args[0].replace('<','').replace('>','') : 0);
        // Do not .toLowerCase() the address is case sensitive
        const to_cornaddy = (event.args[1] ? event.args[1].replace('@', '').replace('<','').replace('>','') : '');
        
        if(withdraw_amount <= 0) {
            const reply = `@${event.user.username}, can not withdraw a negative or zero amount`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }

        const from_result = await mysql.query(`SELECT * FROM users WHERE twitch_username='${event.user.username}'`);
        if(from_result.length === 0) {
            const reply = `@${event.user.username}, you must register to use the $withdraw command (Register with: $bitcorn)`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }
        
        const { json } = await wallet.makeRequest('sendfrom', [
            event.user.username,
            to_cornaddy,
            math.fixed8(+withdraw_amount),
            16,
            `${event.user.username} Withdrew To ${to_cornaddy}`,
            `${event.user.username} Withdrew from ${from_result[0].cornaddy} To ${to_cornaddy}`
        ]);

        if(json.error) {
            await mysql.logit('Wallet Error', JSON.stringify({method: 'sendfrom', module: `${event.configs.name}`, error: json.error}));
            const reply = `Transaction canceled ${event.configs.prefix}${event.configs.name}, @${event.user.username}, can not send wallet message: ${json.error.message}`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }

        txMonitor.monitorInsert({
            account: event.user.username,
            amount: math.fixed8(withdraw_amount),
            txid: json.result,
            cornaddy: from_result[0].cornaddy,
            confirmations: '0',
            category: 'send',
            timereceived: mysql.timestamp(),
            comment: `${event.user.username} Withdrew from ${from_result[0].cornaddy} To ${to_cornaddy}`
        });

        tmi.botWhisper(event.user.username, `@${event.user.username} Here is your withdraw receipt: [BITCORN TRANSACTION] :: Your Address: ${from_result[0].cornaddy} :: ${event.user.username}'s Address: ${to_cornaddy} :: Amount Transacted: ${math.fixed8(withdraw_amount)} CORN :: Transaction ID: ${json.result} :: Explorer: https://explorer.bitcornproject.com/tx/${json.result}`);    

        await mysql.logit('Withdraw Executed', `Executed by ${event.user.username}`);

        return pending.complete(event);
    }
});