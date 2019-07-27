/*

*/

"use strict";

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const crypto = require('crypto');

const Pending = require('../../utils/pending');

const pending = new Pending('token');

module.exports = Object.create({
    configs: {
        name: 'token',
        accessLevel: 'OWNER',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Receive a Token to log in to our Bot\'s API',
        example: '$token',
        prefix: '$'
    },
    async execute(event) {

        tmi.botSay(event.target, `@${event.user.username}, ${event.configs.prefix}${event.configs.name} system is currently under construction cttvDump System will return soon! cttvDump`);
        return { success: false, event };

        if(pending.started(event)) return pending.reply(event, tmi);

        const buffer = crypto.randomBytes(16);
        const token = buffer.toString('hex');

        const update_result = await mysql.query(`UPDATE users SET token = '${token}' WHERE twitch_username = '${event.user.username}'`);

        if(update_result.affectedRows > 0) {
            tmi.botWhisper(event.user.username, `@${event.user.username} Your Token is '${token}' (no ' ' quotes) - Use this to login here: https://dashboard.bitcorntimes.com/ - If you use $token again you will receive a new token your old token will be deleted.`);
        } else {
            tmi.botSay(event.target, `@${event.user.username} You need to register with the $reg command to request a token`);
        }

        return pending.complete(event);
    }
});