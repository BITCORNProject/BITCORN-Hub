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

        const data = {
            receiverId: '',
            receiverName: '',
            senderId: '',
            senderName: '',
            amount: 0
        };

        tmi.botSay(event.target, `@${event.user.username}, ${event.configs.prefix}${event.configs.name} system is currently under construction cttvDump System will return soon! cttvDump`);
        return { success: false, event };

        if(pending.started(event, tmi)) return pending.reply(event, tmi);

        const tip_amount = +(event.args[0] ? event.args[0].replace('<','').replace('>','') : 0);
        const tousername = (event.args[1] ? event.args[1].replace('@', '').replace('<','').replace('>','') : '').toLowerCase();

        if(tip_amount <= 0) {
            const reply = `@${event.user.username}, can not tip a negative or zero amount`;
            tmi.botSay(event.target, reply);
            return pending.complete(event, reply);
        }

        const select_results = await mysql.query(`SELECT * FROM users WHERE twitch_username='${event.user.username}' OR twitch_username='${tousername}'`);
        
        if(select_results.length < 2) {
            const unames = select_results.map(x => `@${x.twitch_username}`).join();
            const reply = `${unames}, must be register to use the $tipcorn command (Register with: $bitcorn)`;
            tmi.botSay(event.target, reply);
            return pending.complete(event, reply);
        }

        const records = {
            from: select_results.filter(x => x.twitch_username === event.user.username)[0],
            to: select_results.filter(x => x.twitch_username === tousername)[0]
        }

        const { json } = await wallet.makeRequest('sendfrom', [
            records.from.twitch_username,
            records.to.cornaddy,
            math.fixed8(tip_amount),
            16,
            `${records.from.twitch_username} Tipped ${records.to.twitch_username}`,
            `${records.from.twitch_username} tipped user ${records.to.twitch_username}`
        ]);

        if(json.error) {
            await mysql.logit('Wallet Error', JSON.stringify({method: 'sendfrom', module: `${event.configs.name}`, error: json.error}));

            const reply = `Transaction canceled, @${event.user.username}, can not send wallet message: ${json.error.message}`;
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }

        txMonitor.monitorInsert({
            account: records.from.twitch_username,
            amount: math.fixed8(tip_amount),
            txid: json.result,
            cornaddy: records.from.cornaddy,
            confirmations: '0',
            category: 'send',
            timereceived: mysql.timestamp(),
            comment: `${records.from.twitch_username} tipped on ${records.to.twitch_username}`
        });

        tmi.botWhisper(event.user.username, `@${event.user.username} Here is your tip receipt: [BITCORN TRANSACTION] :: Your Address: ${records.from.cornaddy} :: ${records.to.twitch_username}'s Address: ${records.to.cornaddy} :: Amount Transacted: ${math.fixed8(tip_amount)} CORN :: Transaction ID: ${json.result} :: Explorer: https://explorer.bitcornproject.com/tx/${json.result}`);
        
        tmi.botWhisper(records.to.twitch_username, `@${records.to.twitch_username} Here is your tip receipt: [BITCORN TRANSACTION] :: Your Address: ${records.to.cornaddy} :: ${records.to.twitch_username}'s Address: ${records.from.cornaddy} :: Amount Transacted: ${math.fixed8(tip_amount)} CORN :: Transaction ID: ${json.result} :: Explorer: https://explorer.bitcornproject.com/tx/${json.result}`);
        
        await mysql.logit('Tip Executed', `Executed by ${event.user.username}`);

        return pending.complete(event);
    }
});