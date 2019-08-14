
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
    try {

        var start = new Date().getTime();


        var end0 = new Date().getTime();
        var time0 = (end0 - start) / 1000;
        console.log('Execution time0: ' + time0);
        

        _.assert(time0);
    } catch (error) {
        console.error(error);
    }
})();