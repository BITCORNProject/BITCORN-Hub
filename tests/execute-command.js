
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
    try {

        const timer = new _.Timer();
        timer.start();
        
        const user = {
            'user-id': "75987197",
            'display-name': "caLLowCreation",
            username: "callowcreation"
        };
        const target = '#callowcreation';
        const type = 'chat';
        const msg = `$rain 2 4`;

        const { success, command, args, message } = _.tmiCommands.verifyCommand(msg.trim());

        if (!success) throw new Error(message);

        const result = await command.execute(Object.create({
            type,
            target,
            msg,
            args,
            user,
            configs: command.configs,
            isDevelopment: _.main.isDevelopment,
            isProduction: _.main.isProduction
        }));

        console.log(result);


        const time = timer.stop();
        console.log('Execution time: ' + time);

        _.assert(time);
    } catch (error) {
        console.error(error);
    }
})();