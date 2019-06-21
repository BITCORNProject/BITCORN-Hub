/*
    
*/

// reload-module
"use strict";

function fixPath(modulePath) {
    return modulePath.replace(/\\/g, "/");
}

exports.fixPath = fixPath;
exports.reload = (modulePath, action) => {
    modulePath = fixPath(modulePath);
    let oldState = {state: 'Not Reloaded'};
    try {
        // Log current module state
        oldState = require.cache[require.resolve(`./${modulePath}`)];
        console.log('------------ [reload module] oldState ------------', oldState);

        // Clear test module from node cache
        delete require.cache[require.resolve(`./${modulePath}`)];

        // Reload test and run module
        const newState = require(`./${modulePath}`);

        // Modify reloaded module
        if(typeof action === 'function') {
            action(oldState, newState);
        }
        
        // Log reloaded module state
        console.log('------------ [reload module] newState ------------', newState);
        return {reloaded: modulePath, success: true, module: newState};
    } catch (error) {
        console.error('------------ ERROR [reload module] ERROR ------------', error);
        return {reloaded: modulePath, success: false, module: oldState};
    }
}