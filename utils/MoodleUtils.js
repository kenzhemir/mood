const axios = require("axios");
const yargs = require("yargs");

const config = require("../config");

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
const MOODLE_FUNCTIONS = {
    getUserInfo: "moodle_webservice_get_siteinfo",
    getUserCourses: "moodle_enrol_get_users_courses",
    getCourseContents: "core_course_get_contents",
};

/**
 * Returns a options for a GET method for moodle API. Sets return format to 'json'.
 * @param {string} token - Access token for moodle system
 * @param {string} func - Moodle function to be requested
 * @param {object} args - Any other arguments to be added for this request
 * @returns {object}
 */
function getMoodleAPIParams(token, func, args) {
    return {
        wstoken: token,
        wsfunction: func,
        moodlewsrestformat: "json",
        ...args,
    }
}

/**
 * This function returns request data asynchronously. Throws exceptions on any error occured.
 * @param {string} url - URL of the moodle API system
 * @param {object} params - GET params for the request
 * @returns {object} response data
 * @throws {Error} In case of any error occur. Information about error is located in error.message
 */
async function requestData(url, params) {
    let response;
    try {
        response = await axios.get(url, {params});
    } catch (e) {
        throw new Error("Network Error");
    }
    if (!response || !response.data) {
        throw new Error(`Error requesting data!`);
    } else if (response.data.error) {
        throw new Error(`Error requesting data: ${response.data.error}!`);
    }
    return response.data;
}

/**
 * This functions returns a promise that fetches token from moodle website
 * @param {string} username - Valid username for moodle system
 * @param {string} password - Valid password for moodle system
 * @returns {string} token - Access token from moodle system
 * @throws {Error} In case of any error occur. Information about error is located in error.message
 */
async function getToken(username, password) {
    const data = await requestData(MOODLE_AUTH_URL, {username, password, service: "moodle_mobile_app"});
    if (!data.token) {
        console.error("getToken: response: " + data);
        throw new Error("Error getting token!");
    }
    return data.token;
}

/**
 * This function returns information about user, given the token
 * @param {string} token - Access token for moodle system
 * @returns {object} result - User info fetched from the moodle system with a given token
 * @throws {Error} In case of any error occur. Information about error is located in error.message
 */
async function getUserInfo(token) {
    return await requestData(MOODLE_API_URL, getMoodleAPIParams(token, MOODLE_FUNCTIONS.getUserInfo, null));
}

/**
 * This function returns ID of the user given user's token string.
 * @param {string} token - Access token for moodle system
 * @returns {string} userid - User id fetched from the moodle system with a given token
 * @throws {Error} In case of any error occur. Information about error is located in error.message
 */
async function getUserId(token) {
    const res = await getUserInfo(token);
    return res.userid;
}

/**
 * This function returns the list of the courses that the user with given token and id is enrolled to
 * @param {string} token - Access token for moodle system
 * @returns {string} userid - User id fetched from the moodle system with a given token
 * @returns {Promise<array>} list of courses that user enrolled to
 */
async function getCourseList(token, userid) {
    return await requestData(MOODLE_API_URL, getMoodleAPIParams(token, MOODLE_FUNCTIONS.getUserCourses, {userid}));
}

/**
 * This function fetches the contents of the course given its id and user's token.
 * @param {string} token - Access token for moodle system
 * @returns {string} courseid - Course id which contents you want to fetch
 * @returns {Promise<object>} the contents of the course
 */
async function getCourseContents(token, courseid) {
    return await requestData(MOODLE_API_URL, getMoodleAPIParams(token, MOODLE_FUNCTIONS.getCourseContents, {courseid}));
}

/**
 * Returns array of course folder objects, given token of the user.
 * Each folder object looks like: { id, name, children }. children is an array of section folder objects.
 * Each section object looks like: { id, order, name, children }. children is an array of file objects.
 * Each file object looks like: { id, name, filename, fileurl }.
 * @param {string} token - Access token for moodle system
 * @returns {Promise<Array>} tree of the file system
 */
async function getFileTree(token){
    let root = [];
    let userid = await getUserId(token);
    let course_list = await getCourseList(token, userid);

    // Loop through every course
    await Promise.all(course_list.map(async (course) => {
        const course_tree = {id: course.id, name: course.fullname, children: []};
        let course_contents = await getCourseContents(token, course.id);
        let counter = 0;

        // Loop through every section of the course
        course_contents.forEach((section) => {
            const section_tree = {id: section.id, order: counter, name: section.name, children: []};
            if (section.modules){

                // Loop through every file of the section
                section.modules.forEach((module) => {
                    if (module.modname === "resource" && module.contents && module.contents[0].type==="file"){
                        const file_obj = module.contents[0];

                        // Add files to section
                        section_tree.children.push({id: module.id, name: module.name, filename: file_obj.filename, fileurl: file_obj.fileurl});
                    }
                })
            }

            // Add section to course
            if (section_tree.children.length > 0) {
                course_tree.children.push(section_tree);
            }
        });

        // Add course to course list
        if (course_tree.children.length > 0){
            root.push(course_tree);
        }
    }));
    return root;
}

/*** Testing purposes only ***/

(async () => {
    try {
        let token = await getToken(username, password);
        let tree = await getFileTree(token);
        console.log(tree);
    } catch (e) {
        console.log(e.message);
    }
})();