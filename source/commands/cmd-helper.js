/*

*/

"use strict";

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
        enabled: (configs) => `${configs.prefix}${configs.name} down for MEGASUPERUPGRADES - INJECTING STEROIDS INTO SOIL 4 cttvPump cttvCorn`
    }
};