
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
    try {

        const amount = 1;
        //const {id: senderId, login: senderName} = await _.helix.getUserLogin('callowcreation');
        const {id: receiverId, login: receiverName} = await _.helix.getUserLogin('naivebot');

        const senderId = '123123123'
        const senderName = 'name123123123'
        const result = await _.databaseApi.criticalRequestTest(databaseApi.db_endpoints.data.tipcorn, senderId, {
            senderId, senderName, receiverId, receiverName, amount
        });

        console.log(result);

        var end0 = new Date().getTime();
        var time0 = (end0 - start) / 1000;
        console.log('Execution time0: ' + time0);

        assert(request_result1);
    } catch (error) {
        console.error(error);
    }
})();
