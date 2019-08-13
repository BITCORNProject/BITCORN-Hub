
/*

*/

"use strict";
const _ = require('./test-dependencies');

(async () => {
    try {
        console.log((new Date()).toLocaleTimeString());
        _.Ticker.stop('sub-tier-awawd-ticker');

        _.assert(Ticker);
    } catch (error) {
        console.error(error);
    }
})();
