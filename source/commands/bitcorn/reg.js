/*

*/

"use strict";

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
        return { success: false, event, message: `Command will be removed - do not use` };
    }
});