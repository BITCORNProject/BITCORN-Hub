/*

*/

'use strict';

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const math = require('../../utils/math');
const wallet = require('../../config/wallet');

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
        //tmi.botSay(event.target, `@${event.user.username}, $tipcorn system is currently under construction cttvDump System will return soon! cttvDump`);
        //return { success: false, event };

        const fromusername = event.user.username;
        const tip_amount = +(event.args[0] ? event.args[0].replace('<','').replace('>','') : 0);
        const tousername = (event.args[1] ? event.args[1].replace('@', '').replace('<','').replace('>','') : '').toLowerCase();
        
        if(tip_amount < 0) {
            const reply = `@${event.user.username}, Cannot Tip Negative Amount`;
            tmi.botSay(event.target, reply);
            return { success: false, event, reply };
        }

        const from_result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE '${fromusername}'`);
        if(from_result.length === 0) {
            const reply = `@${event.user.username}, you must register to use the $tipcorn command (Register with: $reg)`;
            tmi.botSay(event.target, reply);
            return { success: false, event };
        }
        
        const from_record = from_result[0];
        const from_info = {
            cornaddy: from_record.cornaddy,
            balance: math.fixed8(from_record.balance)
        }

        if(from_info.balance < tip_amount) {
            const reply = `@${event.user.username}, Insufficient Funds, Cannot Tip (Check Balance with: $bitcorn)`;
            tmi.botSay(event.target, reply);
            return { success: false, event, reply };
        }

        const to_result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE '${tousername}'`);
        if(to_result.length === 0) {
            const reply = `@${event.user.username}, the user ${tousername} is not registered (Register with: $reg)`;
            tmi.botSay(event.target, reply);
            return { success: false, event, reply };
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
            `${fromusername} tipped you`
        ]);

        if(json.error) {
            const reply = `Transaction canceled, @${event.user.username}, can not send wallet message: ${json.error.message}`;
            tmi.botWhisper(event.user.username, reply);
            return {success: false, event, json, reply};
        }

        const from_final_balance = math.fixed8(from_info.balance - tip_amount);

        const txid = json.result;
        const txtracking_result = await mysql.query(`INSERT INTO txtracking (id,account,amount,txid,address,confirmations,category,timereceived,comment) VALUES (NULL,'${fromusername}','${math.fixed8(tip_amount)}','${txid}','${from_info.cornaddy}','0','send','${mysql.timestamp()}','Tip')`);
        if(txtracking_result.affectedRows === 0) {
            const reply = `@${event.user.username}, failed to record tracking $tipcorn for: ${from_final_balance}`;
            tmi.botSay(event.target, reply);
            return {success: false, event, reply};
        }

        const update_from_result = await mysql.query(`UPDATE users SET balance = '${from_final_balance}' WHERE cornaddy LIKE '${from_info.cornaddy}'`);

        if(update_from_result.affectedRows === 0 && update_from_result.changedRows === 0) {
            const reply = `@${event.user.username}, could not update $tipcorn balance`;
            tmi.botSay(event.target, reply);
            return {success: false, event, reply};
        }
        
        to_info.balance += math.fixed8(tip_amount);
        const update_to_result = await mysql.query(`UPDATE users SET balance = '${to_info.balance}' WHERE cornaddy LIKE '${to_info.cornaddy}'`);

        if(update_to_result.affectedRows === 0 && update_to_result.changedRows === 0) {
            const reply = `@${event.user.username}, could not update $tipcorn for @${tousername} balance`;
            tmi.botSay(event.target, reply);
            return {success: false, event, reply};
        }

        tmi.botWhisper(event.user.username, `@${event.user.username} Here is your tip receipt: [BITCORN TRANSACTION] :: Your Address: ${from_info.cornaddy} :: ${tousername}'s Address: ${to_info.cornaddy} :: Amount Transacted: ${math.fixed8(tip_amount)} CORN :: Transaction ID: ${txid} :: Explorer: https://explorer.bitcorntimes.com/tx/${txid}`);
        
        await mysql.logit('Tip Executed', `Executed by ${event.user.username}`);

        return { success: true, event };
    }
});