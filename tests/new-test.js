
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
    try {

        const timer = new _.Timer();
        timer.start();
        
        
        const filtered = [].filter(x => x.name === '')[0];

        console.log(filtered);


        const time = timer.stop();
        console.log('Execution time: ' + time);

        _.assert(time);
    } catch (error) {
        console.error(error);
    }
})();