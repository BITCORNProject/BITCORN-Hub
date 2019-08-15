
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
    try {
        const timer = new _.Timer();
        timer.start();
        
        const amount = 1;
        const {id: senderId} = await _.helix.getUserLogin('bitcornhub');
        const {id: receiverId} = await _.helix.getUserLogin('naivebot');
        const {id: receiverId1} = await _.helix.getUserLogin('wollac');

        const recipients = [
            {id: '1234567', amount: amount},
            {id: receiverId1, amount: amount},
        ];

        const result = await _.databaseApi.criticalRequest(_.databaseApi.db_endpoints.data.withdraw, senderId, {
            id: senderId,
            cornaddy: 'Cvbnjjmmkk',
            amount
        });

        console.log(result);

        const time = timer.stop();
        console.log('Execution time: ' + time);

        _.assert(_);
    } catch (error) {
        console.error(error);
    }
})();
