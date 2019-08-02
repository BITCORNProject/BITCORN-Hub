/*
    
*/

"use strict";

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

module.exports = Pending;