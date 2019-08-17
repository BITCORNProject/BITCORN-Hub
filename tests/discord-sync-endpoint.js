
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
    try {
        const timer = new _.Timer();
        timer.start();
        
        const url = `https://bitcorn-role-sync.azurewebsites.net/discord`;
        const discord_endpoint = await _.fetch(url, {
            method: 'GET'
        });

        console.log(discord_endpoint);
        console.log(`Sent Discord Sync ${await discord_endpoint.text()}`);

        const time = timer.stop();
        console.log('Execution time: ' + time);

        assert(discord_endpoint);
    } catch (error) {
        console.error(error);
    }
})();

function chunk(array, size) {
    const chunked_arr = [];
    let index = 0;
    while (index < array.length) {
        chunked_arr.push(array.slice(index, size + index));
        index += size;
    }
    return chunked_arr;
}