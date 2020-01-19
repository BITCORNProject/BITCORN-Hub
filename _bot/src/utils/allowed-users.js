/*
    
*/

"use strict";

const fs = require('fs');

exports.isCommandTesters = function(username) {
	const allowed_testers = fs.readFileSync('command_testers.txt', 'utf-8').split('\r\n').filter(x => x);
	if(allowed_testers.length === 0) return true;
    return allowed_testers.includes(username) === true;
}

exports.activityTrackerOmitUsername = function(username) {	
	const omit_usernames = fs.readFileSync('omit_usernames.txt', 'utf-8').split('\r\n').filter(x => x);
	return omit_usernames.includes(username) === true;
}