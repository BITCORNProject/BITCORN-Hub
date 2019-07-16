/*

*/

"use strict";

module.exports = Object.create({
    configs: {
        name: 'caddy',
        accessLevel: 'CHAT',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'View your BITCORN Address',
        example: '$caddy',
        prefix: '$'
    },
    async execute(event) {
        return { success: false, event, message: `Command will be removed - do not use` };
    }
});