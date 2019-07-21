/*

*/

"use strict";

const fetch = require('node-fetch');
const mysql = require('./config/databases/mysql');
const math = require('../source/utils/math');
const wallet = require('./config/wallet');

const minNotifyAmount = math.fixed8(100000);
const notifyUrl = 'https://bitcorn-role-sync.azurewebsites.net/tx';

async function init() {

    const timeValues = {
        SECOND: 1000,
        MINUTE: 1000 * 60
    }

    async function transactionsCheck(count, startIndex = 0) {

        const { json } = await wallet.makeRequest('listtransactions', 
        [
            "*",
            count,
            startIndex
        ]);
        
        if (json.result) {

            //console.log(json.result);

            try {

                for (let i = 0; i < json.result.length; i++) {
                    const item = json.result[i];
                    const category = item['category'];
                    const account = item['account'];
                    const txid = item['txid'] ? item['txid'].replace("'", "").replace('"', '') : item['txid'];
                    const amount = +(item['amount']);
                    const comment = item['comment'] || 'tx';
                    const cornaddy = item['address'];
                    const timereceived = item['timereceived'];
                    const confirmations = item['confirmations'];

                    if(!txid) continue;
                    if (category === 'send') continue;
                    if (account === '') {
                        //console.log(`Tx has no account name failed '${math.fixed8(amount)}','${txid}','${cornaddy}','${confirmations}','${category}','${timereceived}','${mysql.escape(comment)}'`);
                        continue;
                    }

                    const tx_select_result = await mysql.query(`SELECT * FROM txtracking WHERE txid = '${txid}' AND category = 'receive'`);
                    if (tx_select_result.length > 0) {
                        continue;
                    }

                    exports.monitorInsert({
                        account: account,
                        amount: math.fixed8(amount),
                        txid: txid,
                        cornaddy: cornaddy,
                        confirmations: confirmations,
                        category: category,
                        timereceived: timereceived,
                        comment: comment
                    });

                    const to_result = await mysql.query(`SELECT * FROM users WHERE twitch_username = '${account}'`);
                    if (to_result.length === 0) {
                        console.log({ success: false, message: `@${account} user is not registered (Register with: $reg)` });
                        continue;
                    }

                    const to_record = to_result[0];
                    const to_info = {
                        cornaddy: to_record.cornaddy,
                        balance: math.fixed8(+to_record.balance)
                    }

                    to_info.balance += math.fixed8(amount);
                    const update_to_result = await mysql.query(`UPDATE users SET balance = '${to_info.balance}' WHERE cornaddy = '${to_info.cornaddy}'`);

                    if (update_to_result.affectedRows === 0 && update_to_result.changedRows === 0) {
                        console.log({ success: false, message: `@${event.user.username}, could not update $tipcorn for @${tousername} balance` });
                        continue;
                    }
                    const notifications_comment = `Received ${account} CORN "${comment}"`;
                    const insert_result = await mysql.query(`INSERT INTO notifications (id,twitch_username,message,spent,type) VALUES (NULL,${mysql.escape(account)},${mysql.escape(notifications_comment)},'0','0')`);
                    if (insert_result.affectedRows === 0) {
                        console.log(`Insert into tx notifications failed`);
                    }
                    await mysql.logit("Incoming Transaction", `'Receive' Transaction for ${account} :: ${amount} CORN`);
                }

            } catch (e) {
                await mysql.logit("TX-TRACKING-ERROR", `Error: ${e.message}`);
                console.error(`TX-TRACKING-ERROR Error: ${e.message}`);
            }
        } else {
            await mysql.logit('Wallet Error', JSON.stringify({method: 'listtransactions', command: `tx-monitor`, error: json.error}));
    
            console.error('No wallet found or command does not exists');
        }

        setTimeout(() => transactionsCheck(count, startIndex), timeValues.SECOND * 60);
    }

    setTimeout(() => transactionsCheck(1000, 0), timeValues.SECOND * 60);

    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

async function insertTX(txdata) {
    const fields = `(id,account,amount,txid,address,confirmations,category,timereceived,comment)`;
    const values = `(NULL,
        '${txdata.account}',
        '${txdata.amount}',
        '${txdata.txid}',
        '${txdata.cornaddy}',
        '${txdata.confirmations}',
        '${txdata.category}',
        '${txdata.timereceived}',
        ${mysql.escape(txdata.comment)})`;
    const txtracking_result = await mysql.query(`INSERT INTO txtracking ${fields} VALUES ${values}`);
    if (txtracking_result.affectedRows === 0) {
        await mysql.logit("TX-TRACKING-ERROR", `Error: Insert tx failed ${JSON.stringify(txdata)}`);
        throw(new Error(`Insert tx failed ${values}`));
    }
}

async function monitor(txdata){
    if(txdata.amount >= minNotifyAmount) {
        const result = await fetch(notifyUrl, { 
            method: 'POST', 
            body:  new URLSearchParams(txdata)
        });
        console.log(`Sent notify amount ${await result.text()}`);
    }
}

exports.monitorInsert = (txdata) => {
    insertTX(txdata);
    monitor(txdata);
}

exports.init = init;
