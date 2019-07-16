/*

*/

"use strict";

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const math = require('../../utils/math');
const wallet = require('../../config/wallet');

const Pending = require('../../utils/pending');

const pending = new Pending('bitcorn');

module.exports = Object.create({
    configs: {
        name: 'bitcorn',
        accessLevel: 'CHAT',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'View your BITCORN balance and get a BITCORN wallet address if you are not registered',
        example: '$bitcorn',
        prefix: '$'
    },
    async execute(event) {

        if(pending.started(event, tmi)) return pending.reply(event, tmi);

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
        }
        
        const getbalance = await wallet.makeRequest('getbalance', [event.user.username]);
        if (getbalance.json.error) {          
            const reply = `@${event.user.username} something went wrong with the $${event.configs.name} command, please report it`;  
            tmi.botWhisper(event.user.username, reply);
            return pending.complete(event, reply);
        }
        
        tmi.botWhisper(event.user.username, `Your BITCORN Balance is ${getbalance.json.result} CORN | Your BITCORN Address is ${info.cornaddy}`);
        
        await mysql.logit('Balance Request', `Request by ${event.user.username} (${getbalance.json.result} CORN)`);

        return pending.complete(event);
    }
});