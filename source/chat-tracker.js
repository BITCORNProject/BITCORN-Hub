/*

*/

"use strict";

const tmi = require('./config/tmi');
const mysql = require('./config/databases/mysql');

async function onChatMessage(target, user, msg, self) {
    const event = Object.create({ target, user, msg, self });

    if (event.self) { return { success: false, message: `self`, event }; }

    try {
        const channel = event.target.replace('#', '');
        const username = event.user.username;
        const timestamp = mysql.timestamp();
        const char_message = event.msg.split('').map(x => ` ${x.charCodeAt(0)}`).join('');

        //console.log(`*** UPDATING STATS :: '${event.msg}' from ${event.user.username}`);
        const insert_query = `INSERT INTO activitytracking (id,twitch_username,message,td,channel) VALUES (NULL,?,?,?,?)`;
        const insert_values = [username, char_message, timestamp, channel];
        const activitytracking_result = await mysql.query(insert_query, insert_values);
        if (activitytracking_result.affectedRows === 0) {
            return { success: false, message: `Insert activitytracking failed`, event };
        }

        const msg_leaderboards_result = await mysql.query(`SELECT * FROM msg_leaderboards WHERE twitch_username = '${username}'`);
        if (msg_leaderboards_result.length > 0) {
            const message_count = +(msg_leaderboards_result[0].message_count) + 1;
            const sub_plan = 1000;
            const msg_leaderboards_update_result = await mysql.query(`UPDATE msg_leaderboards SET message_count = '${message_count}',sub_plan='${sub_plan}',online='1' WHERE twitch_username = '${username}'`);
            if (msg_leaderboards_update_result.affectedRows === 0) {
                console.log(`Update msg_leaderboards failed`);
            }
        } else {
            const message_count = 1;
            const sub_plan = 1000;
            const msg_leaderboards_insert_result = await mysql.query(`INSERT INTO msg_leaderboards (id,twitch_username,message_count,sub_plan,online) VALUE (NULL,'${username}','${message_count}','${sub_plan}','1')`);
            if (msg_leaderboards_insert_result.affectedRows === 0) {
                console.log(`Insert into msg_leaderboards failed`);
            }
        }

        // Mentions
        const splitTagged = event.msg.split(' ');
        for (let i = 0; i < splitTagged.length; i++) {
            const tagged = splitTagged[i].trim();
            if (tagged.indexOf('@') !== -1) {
                const message = `${username} Tagged you in Twitch Chat :: ${event.msg}`;
                const mentioned = tagged.replace('@', '');
                const insert_result = await mysql.query(`INSERT INTO notifications (id,twitch_username,message,spent,type) VALUES (NULL,${mysql.escape(mentioned)},${mysql.escape(message)},'0','2')`);
                if (insert_result.affectedRows === 0) {
                    console.log(`Insert into notifications failed`);
                }
            }
        }

        const msg_tags_select_result = await mysql.query(`SELECT * FROM msg_tags WHERE twitch_username = '${username}' AND message = '${char_message}'`);
        if (msg_tags_select_result.length === 0) {
            const msg_tags_insert_result = await mysql.query(`INSERT INTO msg_tags (id,twitch_username,message,date_time) VALUES (NULL,'${username}','${char_message}','${mysql.timestamp()}')`);
            if (msg_tags_insert_result.affectedRows === 0) {
                console.log(`Insert into msg_tags failed`);
            }
        }
        return { success: true, message: `Activity tracking for ${username} on ${channel} successful`, event };
    } catch (error) {
        return { success: false, message: error.message, event, error };
    }
}

async function init() {

    tmi.addMessageCallback(onChatMessage);

    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;

