
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
    try {
        var start = new Date().getTime();

        const amount = 1;
        const {id: senderId} = await _.helix.getUserLogin('bitcornhub');
        const {id: receiverId} = await _.helix.getUserLogin('naivebot');
        const {id: receiverId1} = await _.helix.getUserLogin('wollac');

        const recipients = [
            {id: '1234567', amount: amount},
            {id: receiverId1, amount: amount},
        ];

        const result = await _.databaseApi.criticalRequestTest(_.databaseApi.db_endpoints.data.getuser, receiverId, {
            id: receiverId
        });

        console.log(result);

        var end0 = new Date().getTime();
        var time0 = (end0 - start) / 1000;
        console.log('Execution time0: ' + time0);

        _.assert(_);
    } catch (error) {
        console.error(error);
    }
})();
