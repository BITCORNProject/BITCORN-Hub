/*

*/

"use strict";

const tmi = require('../../config/tmi');
const tmiCommands = require('../../tmi-commands');

module.exports = Object.create({
    configs: {
        name: 'help',
        accessLevel: 'CHAT',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Prints bitcorn commands to the chat.',
        example: '',
        prefix: '$'
    },
    async execute(event) {

        tmi.botSay(event.target, `@${event.user.username} - cttvCorn To see all available BITCORN commands, please visit https://bitcorntimes.com/help cttvCorn`);
    
        return { success: true, event };
    }
});