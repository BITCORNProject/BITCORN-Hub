/*
    
*/

"use strict";

const fs = require('fs');

exports.isCommandTesters = function(username) {
	let path = '_data/command_testers.txt';
	const data = fs.readFileSync(path, 'utf-8');
	const json = JSON.parse(data);
	const allowed_testers = json.filter(x => x);
	if(allowed_testers.length === 0) return true;
    return allowed_testers.map(x => x.toLowerCase()).includes(username.toLowerCase()) === true;
}

exports.activityTrackerOmitUsername = function(username) {	
	let path = '_data/omit_usernames.txt';

	const data = fs.readFileSync(path, 'utf-8');
	const json = JSON.parse(data);
	const omit_usernames = json.filter(x => x);
	return omit_usernames.map(x => x.toLowerCase()).includes(username.toLowerCase()) === true;
}