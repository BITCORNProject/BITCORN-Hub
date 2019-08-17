/*

*/

"use strict";

const tmi = require('../../config/tmi');

module.exports = Object.create({
    configs: {
        name: 'enter',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'Prints "As we enter" to the chat.',
        example: '',
        prefix: '$'
    },
    async execute(event) {
        tmi.botSay(event.target, `$BITCORN [${event.args.join(' ')}]`);
        return { success: true, event };
    }
});