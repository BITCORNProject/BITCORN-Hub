/*

*/

"use strict";

const schedule = require('node-schedule');
const auth = require('../settings/auth');
const tmi = require('./config/tmi');

async function init() {

    const register_announcement_rule = new schedule.RecurrenceRule();
    register_announcement_rule.minute = 20;
    
    const register_announcement_schedule = schedule.scheduleJob(register_announcement_rule, () => {
        const message = `cttvGold CORN2MOON If you havent already registered a BITCORN ADDRESS with your Twitch username, type $reg in chat to get one!  And be sure to follow our bot's channel so you can get PM's from it regarding your BITCORN info at www.twitch.tv/BITCORNhub cttvCorn More info if you type !BITCORN in chat cttv420`;
        tmi.botSay(auth.data.CHANNEL_NAME, message);
    });
    
    if(!tmi) {
        register_announcement_schedule.cancel();
    }

    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;

