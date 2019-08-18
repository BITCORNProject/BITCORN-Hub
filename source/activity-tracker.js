/*

*/

"use strict";

const tmi = require('./config/tmi');

const JsonFile = require('../source/utils/json-file');
const serverSettings = require('../settings/server-settings');

const MAX_RAIN_USER_CACHE = serverSettings.getValues().MAX_RAIN_USER_CACHE;
const MAX_RAIN_USER_CACHE_WITH_PADDING = MAX_RAIN_USER_CACHE * 1.4;
let activeChatters = {};
const cursorIndex = {};

async function onChatMessage(target, user, msg, self) {
    const event = Object.create({ target, user, msg, self });
    if (event.self) { return { success: false, message: `self`, event }; }
    addToActiveChatters(target, event.user['user-id'], event.user.username);
}

const ommit_usernames = [
    "nightbot",
    "cttvbotcorn",
    "bitcornhub",
    "stay_hydrated_bot"
];

const activityTracker = new JsonFile('./settings/activity-tracker.json', {});

function addToActiveChatters(target, id, username) {
    if (ommit_usernames.indexOf(username) !== -1) return;

    if (activeChatters[target] === undefined) {
        activeChatters[target] = [];
    }

    activeChatters[target] = activeChatters[target].filter(x => x);

    const indexed = activeChatters[target].filter(x => x).map((x, i) => ({ index: i, id: x.id, username: x.username, count: x.count }));

    let found = indexed.filter(x => x.id === id)[0];

    if (!found) {
        activeChatters[target].unshift({ index: 0, id, username, count: 0 });
        found = activeChatters[target][0];
    }

    const current = activeChatters[target].splice(found.index, 1)[0];

    delete current.index;

    current.count += 1;

    activeChatters[target].unshift(current);

    activeChatters[target].length = MAX_RAIN_USER_CACHE_WITH_PADDING;

    activityTracker.setValues(activeChatters);
}

function getChatterActivity(target) {

    if (activeChatters[target] === undefined) return [];

    let chatternamesArr = [];
    chatternamesArr = chatternamesArr.concat(activeChatters[target]);
    chatternamesArr.length = MAX_RAIN_USER_CACHE;

    // INFO:    Comment below 'sort' to use most active
    //          Uncomment to use most recent
    //chatternamesArr.sort((a, b) => b.count - a.count);

    chatternamesArr = chatternamesArr.map(x => ({ id: x.id, username: x.username }));

    return chatternamesArr;
}

async function init() {

    tmi.addMessageCallback(onChatMessage);

    // converter used to reformat the activity file from id, username to include count
    const converter = activityTracker.getValues();

    for (const target in converter) {
        const value = converter[target];
        if (activeChatters[target] === undefined) {
            activeChatters[target] = [];
        }
        for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if(!item || item.count) continue;
            addToActiveChatters(target, item.id, item.username);
        }
    }
    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;
exports.getChatterActivity = getChatterActivity;

