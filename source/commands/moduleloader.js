/*

*/

"use strict";

const fs = require("fs");
const path = require('path');

module.exports = (modulepath, ommitions) => {
    const modules = [];
    fs.readdirSync(path.join(__dirname, modulepath)).forEach((file) => {
        const pathname = `${modulepath}/${file}`;
        const stat = fs.statSync(path.join(__dirname, pathname));
        const isDir = stat.isDirectory();
        if(!isDir) {
            if(!ommitions || ommitions.indexOf(file) === -1) {
                const mod = require(pathname);
                mod.path = pathname;
                modules.push(mod);
            }
        }
    });
    return modules;
};