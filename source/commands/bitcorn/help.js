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

        tmi.botWhisper(event.user.username, `@${event.user.username} To see all available commands, please visit https://bitcorntimes.com/help/`);
    
        return { success: true, event };
    }
});