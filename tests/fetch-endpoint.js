
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
    try {

        const result = await _.fetch('https://bitcorn-role-sync.azurewebsites.net/tx', { 
            method: 'POST', 
            body:  new URLSearchParams({id: 726377745, name: 'bitcornhub', comment: 'Testing endpoint'})
        });
        
        console.log(await result.text());

        console.log(result);
        _.assert(result);
    } catch (error) {
        console.error(error);
    }
})();