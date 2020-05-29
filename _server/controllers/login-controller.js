/*

*/

"use strict";

const helix = require('../authorize/helix');

module.exports = {
    helix: async (req, res, next) => {
        res.redirect(helix.authUrl());
    }
}