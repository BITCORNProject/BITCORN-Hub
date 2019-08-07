/*
    
*/

"use strict";

const fs = require('fs');

function Pending(command) {
    if(!this.singleuse) this.singleuse = {};
    this.singleuse[command] = {};
}

Pending.prototype.started = function(event) {
    if(this.singleuse[event.configs.name][event.user.username]) return true;
    this.singleuse[event.configs.name][event.user.username] = true;
    return false;
}

Pending.prototype.complete = function(event, message) {
    if(this.singleuse[event.configs.name][event.user.username]) {
        delete this.singleuse[event.configs.name][event.user.username];
    }
    return { success: true, event, message };
}

Pending.prototype.reply = function(event, tmi) {
    const message = `@${event.user.username} command ${event.configs.prefix}${event.configs.name} is pending please wait for a response`;      
    tmi.botWhisper(event.user.username, message);
    return { success: false, event, message };
}

Pending.prototype.respond = function(event, tmi, cmdHelper) {
    const message = `@${event.user.username}, ${cmdHelper.message.enabled({configs: event.configs})}`;
    tmi.botRespond(event.type, event.target, message);
    return this.complete(event, message);
}

Pending.prototype.notEnabled = function(event) {
    return !event.configs.enabled;
}

Pending.prototype.notAllowed = function(event) {
    const allowed_testers = fs.readFileSync('command_testers.txt', 'utf-8').split('\r\n').filter(x => x);
    return allowed_testers.indexOf(event.user.username) === -1 && allowed_testers.length > 0;
}

Pending.prototype.throwNotConnected = function(event, tmi, result) {
    if (result.status && result.status !== 200) {
        const message = `Can not connect to server ${event.configs.prefix}${event.configs.name} failed, please report this: status ${result.status}`;
        tmi.botWhisper(event.user.username, message);
        throw new Error(message);
    }
}

module.exports = Pending;