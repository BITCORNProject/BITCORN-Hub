
/*

*/

"use strict";
const assert = require('assert');

let counter = 0;

(async () => {
    try {

        var schedule = require('node-schedule');

        var rule = new schedule.RecurrenceRule();
        rule.second = 33;

        var j = schedule.scheduleJob(rule, () => {
            counter++;
            console.log('The answer to life, the universe, and everything! ' + counter);
        });

        assert(j);
    } catch (error) {
        console.error(error);
    }
})();