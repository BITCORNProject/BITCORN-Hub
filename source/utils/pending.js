/*
    
*/

"use strict";

const fs = require('fs');

function Pending() {
}

Pending.prototype.complete = function(event, message) {
    return { success: true, event, message };
}

Pending.prototype.respond = function(event, tmi, cmdHelper) {
    const message = `@${event.user.username}, ${cmdHelper.message.enabled({configs: event.configs})}`;
    if(event.isDevelopment) return this.complete(event, message);
    tmi.botRespond(event.type, event.target, message);
    return this.complete(event, message);
}

Pending.prototype.notEnabled = function(event) {
    return !event.configs.enabled;
}

Pending.prototype.notAllowed = function(event) {
    const allowed_testers = fs.readFileSync('command_testers.txt', 'utf-8').split('\r\n').filter(x => x);
    return allowed_testers.length > 0 && allowed_testers.indexOf(event.user.username) === -1;
}

Pending.prototype.throwNotConnected = function(event, tmi, result) {
    if (result.status && result.status !== 200) {
        const message = `Can not connect to server ${event.configs.prefix}${event.configs.name} failed, please report this: status ${result.status}`;
        tmi.botWhisper(event.user.username, message);
        throw new Error(message);
    }
}

module.exports = Pending;