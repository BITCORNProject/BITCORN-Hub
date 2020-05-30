/*

*/

"use strict";

module.exports = {
    index: async (req, res, next) => { 
        res.render('index', { 
            isOverlay: false,
        });
    }
}