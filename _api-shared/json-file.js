/*
    
*/

"use strict";

const p = require('path');
const fs = require('fs');

function JsonFile(file, data) {
    this.data = data || {};
    this.file = file;
    if (fs.existsSync(file)) {
        this.getValues();
    } else {
        const dir = p.dirname(this.file);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        this.setValues(this.data);
        //console.log(`JsonFile ${this.file} initial values`);
    }
    return this;
}

JsonFile.prototype.getValues = function () {
    const data = fs.readFileSync(this.file, 'utf8');
    this.data = JSON.parse(data);
    return this.data;
}

JsonFile.prototype.setValues = function (data) {
    const json = JSON.stringify(data);
    try {
        fs.writeFileSync(this.file, json, 'utf8');
        this.data = data;
        return {success: true, data};
    } catch (error) {
        console.error(error);
        return {success: false, error};
    }
}

module.exports = JsonFile;