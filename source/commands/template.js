/*

*/

"use strict";

module.exports = Object.create({
    configs: {
        name: 'template',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'template command description',
        example: '!template',
        prefix: '!',
        whisper: false,
        enabled: true
    },
    async execute(event) {
        const message = `hey ${event.user.username} template: ${this.configs.prefix}${this.configs.name} ${this.configs.description}`;

        return { success: false, message: message, event };
    }
});