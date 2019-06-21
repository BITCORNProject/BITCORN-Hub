/*

*/

"use strict";

const util = require('util');
const mysql = require('mysql');
const mysqlauth = require('../../../settings/mysqlauth');

mysqlauth.data.multipleStatements = true;
const pool = mysql.createPool(mysqlauth.data);
pool.query = util.promisify(pool.query);

/**
 * You first need to create a formatting function to pad numbers to two digits…
 * https://stackoverflow.com/questions/5129624/convert-js-date-time-to-mysql-datetime/5133807
 **/
function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 * https://stackoverflow.com/questions/5129624/convert-js-date-time-to-mysql-datetime/5133807
 **/
Date.prototype.toMysqlFormat = function() {
    return twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + "-" + this.getUTCFullYear() + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};

exports.timestamp = () => new Date().toMysqlFormat();

exports.query = async (query, values = null) => {
    let result = {};
    if(pool) {
        if(values) {
            result = await pool.query(query, values);
        } else {
            result = await pool.query(query);
        }
    }
    return result;
}

exports.logit = async (logname, information) => {
    try {
        const timedate = new Date().toMysqlFormat();
        const result = await exports.query(`INSERT INTO botlogs (id, timedate, logname, information) VALUES (NULL, '${timedate}', ${pool.escape(logname)},${pool.escape(information)})`);
        if(result.affectedRows === 0) {
            return {success: false, message: `Failed to logit '${timedate}' '${logname}' '${information}'`};
        } else {
            return {success: true, message: `logit: '${timedate}' '${logname}' '${information}'`};
        }
    } catch (error) {
        return {success: false, message: 'Error in logit', error};
    }
}

exports.escape = (value) => {
    return pool.escape(value);
}

exports.init = async () => {
    const result = await new Promise(resolve => {
        // Ping database to check for common exception errors.
        pool.getConnection((err, connection) => {
            if (err) {
                if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                    console.error('Database connection was closed.');
                }
                if (err.code === 'ER_CON_COUNT_ERROR') {
                    console.error('Database has too many connections.');
                }
                if (err.code === 'ECONNREFUSED') {
                    console.error('Database connection was refused.');
                }
                if (err) {
                    console.error('Failed to connect to the database');
                    resolve({ success: false, error: err });
                    return;
                }
            }

            if (connection) connection.release();

            // Promisify for Node.js async/await.
            /*
            exports.query("SELECT * FROM `users` LIMIT 10")
                .then(result => {
                    // Do something with result.
                    console.log(result);
                })
                .catch(error => {
                    // Do something with error :)
                    console.log(error);
                });
            */
            resolve({ success: true });
        });
    });
    return { success: result.success, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

