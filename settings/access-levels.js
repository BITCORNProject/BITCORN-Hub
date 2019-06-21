// access-levels.js
"use strict";

const JsonFile = require('../source/utils/json-file');

function AccessLevels(file, data) {
    JsonFile.call(this, file, data);
    this.access = {};
    this.keys = [];
    this.setAccessLevels();
}

AccessLevels.prototype = Object.create(JsonFile.prototype);

AccessLevels.prototype.getAccessLevel = function (user) {

    if (this.data['NONE'].names.indexOf(user.username) !== -1) {
        return this.access['NONE'];
    }

    for (let index = this.keys.length - 1; index > 0; index--) {
        const key = this.keys[index];
        const levels = this.data[key].names;
        if (levels.indexOf(user.username) !== -1) {
            return index;
        }
    }
    return this.access['CHAT'];
}

AccessLevels.prototype.userHasAccess = function (user, targetLevel) {
    const userAccessLevel = this.getAccessLevel(user);
    const configsAccessLevel = this.access[targetLevel];
    return userAccessLevel >= configsAccessLevel;
}

AccessLevels.prototype.setAccessLevels = function () {
    this.keys = Object.keys(this.data);
    this.keys.sort((a, b) => {
        return (this.data[a].priority > this.data[b].priority) ? 1 : -1;
    });
    this.access = {};
    for (let index = 0; index < this.keys.length; index++) {
        const key = this.keys[index];
        this.access[key] = this.data[key].priority;
    }
}

AccessLevels.prototype.setValues = function (data) {
    return this.__proto__.__proto__.setValues.call(this, data);
}

AccessLevels.prototype.add = function (name) {
    const priority = this.data['OWNER'].priority;
    this.data['OWNER'].priority++;
    this.data[name] = {priority: priority, names: []};
}

AccessLevels.prototype.remove = function (name) {
    for (let i = this.data[name].priority + 1; i < this.keys.length; i++) {
        const key = this.keys[i];
        this.data[key].priority--;
    }
    delete this.data[name];
}

module.exports = new AccessLevels('./settings/access.json', {
    NONE: {priority: 0, names: []},
    CHAT: {priority: 1, names: []},
    FOLLOWER: {priority: 2, names: []},
    STAFF: {priority: 3, names: []},
    OWNER: {priority: 4, names: []}
});