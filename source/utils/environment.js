// environment

"use strict";

const env = process.env.NODE_ENV || 'dev';

function getResultMessage(result) {
    if(!result) {
        console.log({ 'getResultMessage': 'result undefined or null', result });
        return 'result undefined or null';
    }
    if (result.irc) {
        return result.irc.message;
    }
    if (result.resultText) {
        return result.resultText;
    }
    console.log('------------------------HMMMMMMMMMMMM-------------------------');
    console.log(result);
    console.log('------------------------HMMMMMMMMMMMM-------------------------');
    return `environment result has no result text to display`;
}

exports.resultMessage = (result) => {
    const resultMsg = [];
    if (Array.isArray(result) === true) {
        for (let i = 0; i < result.length; i++) {
            resultMsg.push(getResultMessage(result[i]));
        }
    } else {
        resultMsg.push(getResultMessage(result));
    }
    return Promise.resolve({ resultText: resultMsg.join(' | ') });
}

function _console_log(result) {
    if (result) {
        if (result.hasOwnProperty('irc') === false) {
            console.log(result);
        }
    } else {
        console.log({ '_console_log': 'result undefined or null', result });
    }
}

function flattenArray(result, logTime, stacktrace) {
    for (let index = 0; index < result.length; index++) {
        if (!result[index]) continue;
        if (Array.isArray(result[index])) {
            flattenArray(result[index], logTime, stacktrace);
        } else {
            result[index]['log-time'] = logTime;
            result[index]['stack'] = stacktrace.join('\n');
            _console_log(result[index])
        }
    }
}

function flattenArrayStandalone(result, logTime, pointer_id) {
    for (let index = 0; index < result.length; index++) {
        if (!result[index]) continue;
        if (Array.isArray(result[index])) {
            flattenArrayStandalone(result[index], logTime, pointer_id);
        } else {
            const resultText = result[index].resultText ? result[index].resultText : JSON.stringify(result[index]);
            console.log(`${pointer_id}${resultText} ${logTime}`);
        }
    }
}

exports.log = (promiseResult) => {
    if(!promiseResult) {
        console.log('=====> promiseResult is undefined or null');
        return;
    }
    if(Object.keys(promiseResult).length === 0) {
        return;
    }
    const date = new Date()
    const logTime = `[${date.toLocaleTimeString()} ${date.toLocaleDateString()}]`;
    exports.invoke(async () => {
        const stacktrace = new Error().stack.replace('Error\n    ', '')
            .split('\n')
            .map(x => x.trim())
            .filter(x => x.indexOf("environment.js") === -1 && x.indexOf("process/next_tick.js") === -1);
        const result = promiseResult;

        if (Array.isArray(result)) {
            flattenArray(result, logTime, stacktrace);
        } else {
            result['log-time'] = logTime;
            result['stack'] = stacktrace.join('\n');
            _console_log(result);
        }
    }, async () => {
        let pointer_id = '-> ';
        if (promiseResult.event && promiseResult.event.data && promiseResult.event.data.user) {

            if (promiseResult._name && promiseResult._username) {
                pointer_id += [`${promiseResult._name} ${promiseResult._username}: `]
            } else {
                pointer_id += `${promiseResult.event.data.user.username}: `;
            }

        }

        const result = promiseResult;

        if (Array.isArray(result)) {
            flattenArrayStandalone(result, logTime, pointer_id);
        } else {
            const resultText = result.resultText ? result.resultText : JSON.stringify(result);
            console.log(`${pointer_id}${resultText} ${logTime}`);
        }
    });
}

exports.error = (error) => {
    console.error(error);
}

exports.invoke = (devFunc, relFunc) => {
    if (env === 'development') {
        devFunc();
    } else {
        relFunc();
    }
};

exports.execute = async () => {
    if (env === 'development') {
        return Promise.resolve({ type: 'dev' });
    } else {
        return Promise.resolve({ type: 'rel' });
    }
};
/*
    environment.execute().then((env) => {
        let logResult = `${pointer_id}${result.resultText}`;
        if(env.type === 'dev') {
            logResult = promiseResult;
            logResult['log-time'] = logTime;
        }
        console.log(logResult);
    });
*/