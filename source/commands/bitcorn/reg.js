/*

*/

"use strict";

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const wallet = require('../../config/wallet');
const math = require('../../utils/math');

module.exports = Object.create({
    configs: {
        name: 'reg',
        accessLevel: 'CHAT',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Get a BITCORN wallet address',
        example: '$reg',
        prefix: '$'
    },
    async execute(event) {

        if(wallet.queueBusy()) {
            const count = wallet.queueCount() || 1;
            const msg = `The bot is currently under load processing ${count} items.  Please wait a couple minutes and try to $reg again.`;
            tmi.botWhisper(event.user.username, msg);
            return { success: false, event, message: msg };
        }

        const result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE '${event.user.username}'`);
        
        const info = {
            cornaddy: result[0] ? result[0].cornaddy : '',
            balance: math.fixed8(result[0] ? result[0].balance : 0.0),
        };

        if (result.length === 0) {
            const { json } = await wallet.makeRequest('getnewaddress', [event.user.username]);
            info.cornaddy = json.result || '';
            info.balance = math.fixed8(0.0);
            const twitchid = event.user['user-id'];
            await mysql.query(`INSERT INTO users (id,discordid,twitch_username,cornaddy,balance,token,level,avatar,subtier,twitchid,twitterid,instagramid) VALUES (NULL,'NA','${event.user.username}','${info.cornaddy}','${info.balance}','NA','1000','NA','','${twitchid}','','')`);
            
            await mysql.logit('Registered Address', `Request by ${event.user.username}`);
        } else {
            await mysql.logit('Address Request', `Request by ${event.user.username}`);
        }
        
        tmi.botWhisper(event.user.username, `Your BITCORN Address is ${info.cornaddy}`);

        return { success: true, event };
    }
});