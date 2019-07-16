/*

*/

'use strict';

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const math = require('../../utils/math');
const wallet = require('../../config/wallet');
const txMonitor = require('../../tx-monitor');

const Pending = require('../../utils/pending');

const pending = new Pending('tipcorn');

module.exports = Object.create({
    configs: {
        name: 'tipcorn',
        accessLevel: 'OWNER',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Tips a user with bitcorn',
        example: '$tipcorn <amount> <username>',
        prefix: '$'
    },
    async execute(event) {
        
        if(pending.started(event, tmi)) return pending.reply(event, tmi);

        const fromusername = event.user.username;
        const tip_amount = +(event.args[0] ? event.args[0].replace('<','').replace('>','') : 0);
        const tousername = (event.args[1] ? event.args[1].replace('@', '').replace('<','').replace('>','') : '').toLowerCase();
        
        if(tip_amount < 0) {
            const reply = `@${event.user.username}, Cannot Tip Negative Amount`;
            tmi.botSay(event.target, reply);
            return pending.complete(event, reply);
        }

        const from_result = await mysql.query(`SELECT * FROM users WHERE twitch_username = '${fromusername}'`);
        if(from_result.length === 0) {
            const reply = `@${event.user.username}, you must register to use the $tipcorn command (Register with: $reg)`;
            tmi.botSay(event.target, reply);
            return pending.complete(event, reply);
        }
        
        const getbalance = await wallet.makeRequest('getbalance', [event.user.username]);
        
        const from_record = from_result[0];
        const from_info = {
            cornaddy: from_record.cornaddy,
            balance: math.fixed8(getbalance.json.result)
        };

        if(from_info.balance < tip_amount) {
            const reply = `@${event.user.username}, Insufficient Funds, Cannot Tip (Check Balance with: $bitcorn)`;
            tmi.botSay(event.target, reply);
            return pending.complete(event, reply);
        }

        const to_result = await mysql.query(`SELECT * FROM users WHERE twitch_username = '${tousername}'`);
        if(to_result.length === 0) {
            const reply = `@${event.user.username}, the user ${tousername} is not registered (Register with: $reg)`;
            tmi.botSay(event.target, reply);
            return pending.complete(event, reply);
        }        
        
        const to_record = to_result[0];
        const to_info = {
            cornaddy: to_record.cornaddy,
            balance: math.fixed8(+to_record.balance)
        }

        const { json } = await wallet.makeRequest('sendfrom', [
            fromusername,
            to_info.cornaddy,
            math.fixed8(tip_amount),
            0,
            `${fromusername} Tipped ${tousername}`,
            `${fromusername} tipped user ${tousername}`
        ]);

        if(json.error) {
            const reply = `Transaction canceled, @${event.user.username}, can not send wallet message: ${json.error.message}`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }

        txMonitor.monitorInsert({
            account: fromusername,
            amount: math.fixed8(tip_amount),
            txid: json.result,
            cornaddy: from_info.cornaddy,
            confirmations: '0',
            category: 'send',
            timereceived: mysql.timestamp(),
            comment: `${fromusername} tipped on ${tousername}`
        });

        tmi.botWhisper(event.user.username, `@${event.user.username} Here is your tip receipt: [BITCORN TRANSACTION] :: Your Address: ${from_info.cornaddy} :: ${tousername}'s Address: ${to_info.cornaddy} :: Amount Transacted: ${math.fixed8(tip_amount)} CORN :: Transaction ID: ${json.result} :: Explorer: https://explorer.bitcornproject.com/tx/${json.result}`);
        
        tmi.botWhisper(tousername, `@${event.user.username} Here is your tip receipt: [BITCORN TRANSACTION] :: Your Address: ${to_info.cornaddy} :: ${tousername}'s Address: ${from_info.cornaddy} :: Amount Transacted: ${math.fixed8(tip_amount)} CORN :: Transaction ID: ${json.result} :: Explorer: https://explorer.bitcornproject.com/tx/${json.result}`);
        
        await mysql.logit('Tip Executed', `Executed by ${event.user.username}`);

        return pending.complete(event);
    }
});