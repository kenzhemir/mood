const axios = require("axios");
const yargs = require("yargs");

const config = require("./config");

const argv = yargs
    .option('username', {
        alias: 'u',
        demand: true
    })
    .option('password', {
        alias: 'p',
        demand: true
    })
    .help()
    .argv;


const MOODLE_URL = config.MOODLE_URL;
const MOODLE_API_URL = `${MOODLE_URL}/webservice/rest/server.php`;
const MOODLE_AUTH_URL = `${MOODLE_URL}/login/token.php`;
const service = "moodle_mobile_app";
const username = argv.username;
const password = argv.password;

/**
 * This functions returns a promise that fetches token from moodle website
 * @param username
 * @param password
 * @returns {Promise<void>}
 */
export async function getToken(username, password) {
    let response;
    try {
        response = await axios.get(MOODLE_AUTH_URL, {params: {username, password, service}});
    } catch(e) {
        console.error(e.message);
        throw new Error("Network error");
    }
    if (!response || !response.data || !response.data.token){
        const errStr = (response.data.error) ? ': '+response.data.error : '';
        throw new Error(`Error requesting token${errStr}!`);
    }
    return response.data.token;
}


//// Testing purposes only

getToken(username, password)
    .then(token => console.log(`Token acquired: ${token}`))
    .catch(error => console.log(`Error requesting token: ${error.message}`));