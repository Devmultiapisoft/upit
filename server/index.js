'use strict';
const server = require('./src/server');
const log = require('./src/services/logger').getAppLevelInstance();
const cron = require('node-cron');
const axios = require('axios');
/*************************************************************************************/
/* START PROCESS UNHANDLED METHODS */
/*************************************************************************************/
process.on('unhandledRejection', (reason, p) => {
	log.error('Unhandled Rejection at:', p, 'reason:', reason);
	log.error(`API server exiting due to unhandledRejection...`);
	process.exit(1);
});
process.on('uncaughtException', (err) => {
	log.error('Uncaught Exception:', err);
	log.error(`API server exiting due to uncaughtException...`);
	process.exit(1);
});
/*************************************************************************************/
/* END PROCESS UNHANDLED METHODS */
/*************************************************************************************/

cron.schedule('0 6 * * *', async () => {
	try {
		if (process.env.CRON_STATUS === '0') return
		let crons = process.env.CRONS.split(',')
		if (crons[0].length > 1) throw "No Crons Available"
		for (const cron of crons)
			await axios.post(`${process.env.BASE_URL}/cron/${cron}`, { key: process.env.APP_API_KEY })
		console.log('Daily Cron job ran successfully.');
	} catch (error) {
		console.error('Error:', error);
	}
})

cron.schedule('* * * * *', async () => {
	try {
		if (process.env.CRON_STATUS === '0') return
		let crons = process.env.MIN_CRONS.split(',')
		if (crons[0].length > 1) throw "No Crons Available"
		for (const cron of crons)
			await axios.post(`${process.env.BASE_URL}/cron/${cron}`, { key: process.env.APP_API_KEY })
		console.log('Minute Cron job ran successfully.');
	} catch (error) {
		console.error('Error:', error);
	}
})

/**
 * START THE SERVER
 */
const appServer = new server();
appServer.start(); 
