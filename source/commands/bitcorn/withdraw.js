/*

*/

'use strict';

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const math = require('../../utils/math');
const wallet = require('../../config/wallet');

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

        const fromusername = event.user.username;
        const withdraw_amount = +(event.args[0] ? event.args[0].replace('<','').replace('>','') : 0);
        // Do not .toLowerCase() the address is case sensitive
        const to_cornaddy = (event.args[1] ? event.args[1].replace('@', '').replace('<','').replace('>','') : '');
        
        if(withdraw_amount <= 0) {
            const reply = `@${event.user.username}, Cannot Withdraw Negative or Zero Amount`;
            tmi.botWhisper(event.target, reply);
            return { success: false, event, reply };
        }

        const from_result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE '${fromusername}'`);
        if(from_result.length === 0) {
            const reply = `@${event.user.username}, you must register to use the $tipcorn command (Register with: $reg)`;
            tmi.botWhisper(event.target, reply);
            return { success: false, event, reply };
        }
        
        const from_record = from_result[0];
        const from_info = {
            cornaddy: from_record.cornaddy,
            balance: math.fixed8(from_record.balance)
        }

        if(from_info.balance < withdraw_amount) {
            const reply = `@${event.user.username}, Insufficient Funds, Cannot Withdraw (Check Balance with: $bitcorn)`;
            tmi.botWhisper(event.target, reply);
            return { success: false, event, reply };
        }

        const to_info = {
            cornaddy: to_cornaddy,
            balance: math.fixed8(+withdraw_amount)
        }

        const { json } = await wallet.makeRequest('sendtoaddress', [
            to_info.cornaddy,
            to_info.balance,
            `${fromusername} Withdrew To ${to_info.cornaddy}`
        ]);

        if(json.error) {
            const reply = `Transaction canceled ${event.configs.prefix}${event.configs.name}, @${event.user.username}, can not send wallet message: ${json.error.message}`;
            tmi.botWhisper(event.target, reply);
            return {success: false, event, reply};
        }

        const from_final_balance = math.fixed8(from_info.balance - withdraw_amount);

        const update_from_result = await mysql.query(`UPDATE users SET balance = '${from_final_balance}' WHERE cornaddy LIKE '${from_info.cornaddy}'`);

        if(update_from_result.affectedRows === 0 && update_from_result.changedRows === 0) {
            const reply = `@${event.user.username}, could not update ${event.configs.prefix}${event.configs.name}`;
            tmi.botWhisper(event.target, reply);
            return {success: false, event, reply};
        }

        const txid = json.result;
        const txtracking_result = await mysql.query(`INSERT INTO txtracking (id,account,amount,txid,address,confirmations,category,timereceived,comment) VALUES (NULL,'${fromusername}','${math.fixed8(withdraw_amount)}','${txid}','${from_info.cornaddy}','0','send','${mysql.timestamp()}','Withdraw')`);
        if(txtracking_result.affectedRows === 0) {
            const reply = `@${event.user.username}, failed to record tracking ${event.configs.prefix}${event.configs.name}`;
            tmi.botWhisper(event.target, reply);
            return {success: false, event, reply};
        }

        tmi.botWhisper(event.user.username, `@${event.user.username} Here is your withdraw receipt: [BITCORN TRANSACTION] :: Your Address: ${from_info.cornaddy} :: ${fromusername}'s Address: ${to_info.cornaddy} :: Amount Transacted: ${math.fixed8(withdraw_amount)} CORN :: Transaction ID: ${txid} :: Explorer: https://explorer.bitcornproject.com/tx/${txid}`);    

        await mysql.logit('Withdraw Executed', `Executed by ${event.user.username}`);

        return { success: true, event };
    }
});