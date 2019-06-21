/*

*/

"use strict";

const kraken = require('../config/authorize/kraken');
const helix = require('../config/authorize/helix');

module.exports = {
    kraken: async (req, res, next) => {
        res.redirect(kraken.authUrl());
    },
    helix: async (req, res, next) => {
        res.redirect(helix.authUrl());
    }
}