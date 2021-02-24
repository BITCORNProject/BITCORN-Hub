/*

*/

"use strict";

const helix = require('../config/authorize/helix');

module.exports = {
    helix: async (req, res, next) => {
        res.redirect(helix.authUrl());
    }
}