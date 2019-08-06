/*

*/

"use strict";

const tmi = require('../config/tmi');

function brackets(value) {
    return value ? value.replace('<', '').replace('>', '') : ''
}

function at(value) {
    return brackets(value).replace('@', '');
}

function atLower(value) {
    return at(value).toLowerCase();
}

function amount(value) {
    return +brackets(value);
}

function isNumber(value) {
    return !isNaN(value);
}

function _respond(func, target, condition, reply) {
    if (condition) {
        func(target, reply);
        return true;
    }
    return false;
}

const funcs = {
    'chat': (event, condition, reply) => _respond(tmi.botSay, event.target, condition, `@${event.user.username}, ${reply}`),
    'whisper': (event, condition, reply) => _respond(tmi.botWhisper, event.user.username, condition, reply)
};

function throwIfCondition(event, condition, obj) {
    const message = obj.method(obj.params);
    if (obj.reply(event, condition, message)) {
        const e = new Error(message);
        e.hasMessage = true;
        throw e;
    }
}
const messages = {
    example: (obj) => `Here is an example of the command - ${obj.configs.example}`
}

module.exports = {
    isNumber: isNumber,
    clean: {
        brackets: brackets,
        at: at,
        atLower: atLower,
        amount: amount    
    },
    twitch: {
        id: (user) => user['user-id'],
        username: (user) => user['username'],
    },
    message: {
        enabled: (obj) => `${obj.configs.prefix}${obj.configs.name} down for MEGASUPERUPGRADES - INJECTING STEROIDS INTO SOIL 4 cttvPump cttvCorn`,
        example: messages.example,
        nonegitive: (obj) => `Can not ${obj.configs.name} zero or negative amount`,
        maxamount: (obj) => `Can not ${obj.configs.name} an amount that large - ${messages.example(obj)}`,
        numpeople: (obj) => `Number of people you can ${obj.configs.name} to is 1 to ${obj.max}`,
        noname: (obj) => `You must ${obj.configs.name} someone - ${messages.example(obj)}`,
        badname: (obj) => `cttvMOONMAN Here's a tip for you: ${obj.receiverName} who? cttvMOONMAN`,
        nochatters: () => `There are no active chatters, let's make some noise cttvCarlos cttvGo cttv3`,
        cornaddyneeded: () => `Can not withdraw without a cornaddy - $withdraw <amount> <address>`,
        apifailed: (obj) => `Can not connect to server ${obj.configs.prefix}${obj.configs.name} failed, please report this: status ${obj.status}`,
        notnumber: messages.example
    },
    reply: {
        chat: (event, condition, reply) => funcs['chat'](event, condition, reply),
        whisper: (event, condition, reply) => funcs['whisper'](event, condition, reply),
        respond: (event, condition, reply) => funcs[event.type](event, condition, reply)
    },
    throwIfCondition: throwIfCondition
};