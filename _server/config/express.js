/*

*/

"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const nocache = require('nocache')

const router = require('./router');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views-front');

app.disable('view cache');

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(nocache());

app.use((req, res, next) => {
    if (req.user) {
        res.locals.currentUser = req.user;
    }

    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');

    next();
});

router.init(app);

module.exports = app;