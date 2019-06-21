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
        description: 'Prints twitch commands to the chat.',
        example: '',
        prefix: '!'
    },
    async execute(event) {

        const helpNames = [];

        const commands = tmiCommands.getCommands(this.configs.prefix);
        if(commands) {
            commands.forEach((value, key) => {
                const prefix = value.configs ? value.configs.prefix : value.prefix;
                if(key !== this.configs.name && prefix === this.configs.prefix) {
                    helpNames.push(`${prefix}${key}`);
                }
            });
            tmi.botWhisper(event.user.username, `@${event.user.username} help: ${helpNames.join(' :: ')}`);
    
            return { success: true, event };
        } else {
            const message = `Failed to fine help for ${this.configs.prefix} prefix`;
            return { success: false, message: message, event };
        }
    }
});