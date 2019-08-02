
/*

*/

"use strict";
const fs = require('fs');
const assert = require('assert');
const fetch = require('node-fetch');

const walletSettings = require('../settings/wallet-settings');
const wallet = require('../source/config/wallet');
const mysql = require('../source/config/databases/mysql');
const math = require('../source/utils/math');
const kraken = require('../source/config/authorize/kraken');
const helix = require('../source/config/authorize/helix');

const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {
        const max = 1000000;

        const container = {};

        for (let index = 0; index < max; index++) {
            container[`user${index}`] = `user${index}`;
        }

        console.log(container);

        var start = new Date().getTime();

        function twitchsync() {
            sequalize.sequalizeRef.query("UPDATE users SET subtier = 'NONE'").then(rows => {
                console.log(JSON.stringify(rows));
            });
        
            let limit = 100;
            let offset = 0;
            var total;
            fetch(`https://api.twitch.tv/kraken/channels/223836682/subscriptions?limit=${limit}&offset=${offset}`, {
                method: "GET",
                headers: {
                    "Authorization": "OAuth h0hrblvd01iz3ji920hsadwpzho1s7",
                    "Accept": "application/vnd.twitchtv.v5+json",
                    "Client-ID": "5bs46vc6tiqaj77dhmc85qpsiqg4d2"
                }
            }).then(async(res) => {
                json = await res.json();
                total = json._total;
                console.log(total);
                for (count = 0; count < total; count += 100) {
                    fetch(`https://api.twitch.tv/kraken/channels/223836682/subscriptions?limit=${limit}&offset=${offset}`, {
                            method: "GET",
                            headers: {
                                "Authorization": "OAuth h0hrblvd01iz3ji920hsadwpzho1s7",
                                "Accept": "application/vnd.twitchtv.v5+json",
                                "Client-ID": "5bs46vc6tiqaj77dhmc85qpsiqg4d2"
                            }
                        })
                        .then(async(res) => {
                            json = await res.json();
                            json.subscriptions.forEach(sub => {
                                twitchId = sub.user._id;
                                subTeir = sub.sub_plan;
                                let updateValues = { subtier: subTeir };
                                sequalize.User.update(updateValues, { where: { twitchid: twitchId } }).then((result) => {});
                            });
                            offset += 100;
                        });
                }
            });
        }


        var end0 = new Date().getTime();
        var time0 = (end0 - start) / 1000;
        console.log('Execution time0: ' + time0);

        assert(time0);
    } catch (error) {
        console.error(error);
    }
})();