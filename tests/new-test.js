
/*

*/

"use strict";

const _ = require('./test-dependencies');

(async () => {
    try {

        const timer = new _.Timer();
        timer.start();
        
        

        /*const command = _.tmiCommands.getCommand('$', 'tipcorn');

        const event = Object.create({
            type: 'chat',
            target: 'callowcreation',
            msg: '$tipcorn @naivebot 100',
            args: ['', ''],
            user: {},
            configs: command.configs,
            isDevelopment: _.main.isDevelopment,
            isProduction: _.main.isProduction
        });

        const result = await command.execute(event);

        console.log(result);*/

        const time = timer.stop();
        console.log('Execution time: ' + time);

        _.assert(time);
    } catch (error) {
        console.error(error);
    }
})();