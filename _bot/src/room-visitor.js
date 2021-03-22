"use strict";


const fs = require('fs');
const _ = require('lodash');
const fetch = require("node-fetch")
let joinedChannels = [];
const filename = './_bot/settings/channels.json';

module.exports = async (tmi) => {

	async function partChannels(tmi, leaves) {
		for (let i = 0; i < leaves.length; i++) {
			const result = await tmi.partChannel(leaves[i]);
			console.log({ left_channel: result.join() });
		}
	}

	async function joinChannels(tmi, joins) {
		for (let i = 0; i < joins.length; i++) {
			const result = await tmi.joinChannel(joins[i]);
			console.log({ join_channel: result.join() });
		}
	}

	try {

		const channels = JSON.parse(fs.readFileSync(filename, 'utf-8'));
		
		console.log({ 'channels': channels.join() });

		joinedChannels = channels;

		await joinChannels(tmi, joinedChannels);

	} catch (error) {
		console.log(error);
	}

	fs.watchFile(filename, async (cur, prev) => {
		try {
			const channels = JSON.parse(fs.readFileSync(filename, 'utf-8'));

			const leaves = _.difference(joinedChannels, channels);
			const joins = _.difference(channels, joinedChannels);

			await partChannels(tmi, leaves);

			await joinChannels(tmi, joins);

			joinedChannels = channels;
		} catch (error) {
			console.log(error);
		}
	});
	/*
	setInterval(() => { 
		try {
			const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlJEZ3dPREZCUWpSR05FRkdSVGhDTmpsRlJVTkNSamcwUlRWRE56WTBRelZDTlRFelF6STRSZyJ9.eyJpc3MiOiJodHRwczovL2JpdGNvcm4tdGVzdC5hdXRoMC5jb20vIiwic3ViIjoiaHVpSm5RZ0p2bXZmVDAzWFhGNUxYdUVHd0gwNTI3UU9AY2xpZW50cyIsImF1ZCI6IkJJVENPUk5TZXJ2aWNlLVRlc3QiLCJpYXQiOjE2MDgxMzUyMjQsImV4cCI6MTYwODIyMTYyNCwiYXpwIjoiaHVpSm5RZ0p2bXZmVDAzWFhGNUxYdUVHd0gwNTI3UU8iLCJzY29wZSI6InRyYW5zYWN0aW9uOnNlbmQgdHJhbnNhY3Rpb246d2l0aGRyYXcgdXNlcjpjaGFuZ2UgdXNlcjpyZWFkIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.tH-1aXEYr6x-FZVe1GC02HWH1MW8yse318JNGDeQ04KQaDNiWtVxR760Qdrnlw0wJqRvjNYGpbBX7aq_H2_UdSw3W5nGHWjFSAXmIQ4lBA2rC4av0KJHrXWVriY8m3QlwqCU931qVLz238YVZPe2SSOFqUQ1UBZdfkmLpYVbCa-UpmPGM9C4I5stnBxpLZyyTUrRIwujFq20mC31A4qhvPRLcFiX9KJYjT663BT9MiwYVpo77vWjsoLS_9mtBbUWFMn302c7Bvdb-HvwF_MT4rK-etuCYnyiYZ-71Alieso6TavAtz5ACemV_ycuOvJDb-7WoG-35XThdG0qkR4Bfw"
			fetch("https://bitcorndataservice-dev.azurewebsites.net/api/user/livestreams", {
				method: "GET",
				headers: {
					"authorization":"bearer " + token
				}
			}).
			then(e=>e.json()).then((e)=>console.log(e))
		
		} catch(ex) {
			console.log("error"+ex)
		}
	}, 3000);
	*/
	return { success: false };
};