
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
    try {

        const timer = new _.Timer();
        timer.start();
        

        const timeInMinutes = (60 * 1000) * 13;

        const time_ = new _.Time(timeInMinutes);

        console.log(time_.toString());


        const time = timer.stop();
        console.log('Execution time: ' + time);

        _.assert(time);
    } catch (error) {
        console.error(error);
    }
})();