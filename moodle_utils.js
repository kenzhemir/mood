const axios = require("axios");
const yargs = require("yargs");

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


const MOODLE_URL = "http://moodle.nu.edu.kz";
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
async function getToken(username, password) {
    try {
        const response = await axios.get(MOODLE_AUTH_URL, {params: {username, password, service}});
        return response.data;
    } catch(e) {
        console.error(e.message);
        throw new Error("Network error");
    }
}


//// Testing purposes only

getToken(username, password)
    .then(res => {
        if (res.error){
            console.log(`Error requesting token: ${res.error}`);
        } else {
            console.log(`Token has been acquired! Token: ${res.token}`);
        }
    })
    .catch(error => console.log(`Error requesting token: ${error.message}`));