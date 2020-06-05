/*
    
*/

"use strict";

const endOfLine = require('os').EOL;
const fs = require('fs');

function trimLower(value) {
	return value.trim().toLowerCase();
}

exports.isCommandTesters = function(username) {
	const allowed_testers = fs.readFileSync('command_testers.txt', 'utf-8').split(endOfLine).filter(x => x);
	if(allowed_testers.length === 0) return true;
    return allowed_testers.map(trimLower).includes(trimLower(username)) === true;
}

exports.activityTrackerOmitUsername = function(username) {	
	const omit_usernames = fs.readFileSync('omit_usernames.txt', 'utf-8').split(endOfLine).filter(x => x);
	return omit_usernames.map(trimLower).includes(trimLower(username)) === true;
}