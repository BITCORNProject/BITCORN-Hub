/*

*/

"use strict";

module.exports = {
    index: async (req, res, next) => { 
        res.render('home/index', { 
            isOverlay: false,
        });
    }
}