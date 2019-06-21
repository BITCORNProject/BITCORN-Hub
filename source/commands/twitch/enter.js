/*

*/

"use strict";

const tmi = require('../../config/tmi');

module.exports = Object.create({
    configs: {
        name: 'enter',
        accessLevel: 'FOLLOWER',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Prints "As we enter" to the chat.',
        example: '',
        prefix: '$'
    },
    async execute(event) {
        tmi.botSay(event.target, `As we enter [${event.args.join(' ')}]`);
        return { success: true, event };
    }
});