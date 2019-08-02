/*

*/

"use strict";

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const math = require('../../utils/math');
const wallet = require('../../config/wallet');
const databaseAPI = require('../../config/api-interface/database-api');

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
        /*
        code: 1
        content: {
        balance:940818221.7236394
        cornaddy:"CQwpmd5aixLM5ycmfRPEV9CkYjd2q5z9zz"
        isnewuser:false
        twitchId:"403023969"
        }
        
        */
        //tmi.botSay(event.target, `@${event.user.username}, ${event.configs.prefix}${event.configs.name} system is currently under construction cttvDump System will return soon! cttvDump`);
        //return { success: false, event };

        const twitchId = event.user['user-id'];
        const twitchUsername = event.user.username;

        const bitcorn_result = await databaseAPI.bitcornRequest(twitchId, twitchUsername);

        switch (bitcorn_result.content.code) {
            case databaseAPI.paymentCode.Success:
                if (bitcorn_result.content.isnewuser) {

                } else {
                    tmi.botWhisper(twitchUsername, `Howdy BITCORN Farmer!  You have amassed ${bitcorn_result.content.balance} $BITCORN in your corn silo!  Your silo is currently located at this BITCORN Address: ${bitcorn_result.content.cornaddy}`);
                }
                break;
            default:
                const reply = `Something went wrong with the rain command, please report this: code ${token_result.senderResponse.code}`;
                tmi.botWhisper(twitchUsername, reply);
                return pending.complete(event, reply);
        }
    }
});