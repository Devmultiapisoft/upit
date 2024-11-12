const { settingDbHandler } = require("../services/db");
const logger = require("../services/logger");
const log = new logger("validationController").getChildLogger();

module.exports = async (req, res, next) => {
    try {
        if (req.body.key !== process.env.APP_API_KEY) {
            log.error(`Invalid Key`);
            return res.status(422).send({
                status: false,
                message: `Invalid Key`,
            });
        }

        next();
    } catch (error) {
        log.error(`Error fetching key: ${error.message}`);
        return res.status(500).send({
            status: false,
            message: `Internal Server Error`,
        });
    }
};