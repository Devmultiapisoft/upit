'use strict';
const logger = require('../../services/logger');
const log = new logger('userInfoController').getChildLogger();
const { userDbHandler, verificationDbHandler, settingDbHandler, incomeDbHandler, socialLinksDbHandler } = require('../../services/db');
const bcrypt = require('bcryptjs');
const config = require('../../config/config');
const jwtService = require('../../services/jwt');
const responseHelper = require('../../utils/customResponse');
const { levelIncome } = require('./cron.controller');
const { userModel } = require('../../models');
const { getChildLevelsByRefer } = require('../../services/commonFun');

/*******************
 * PRIVATE FUNCTIONS
 ********************/
/**
 * Method to Compare password
 */
let _comparePassword = (reqPassword, userPassword) => {
    return new Promise((resolve, reject) => {
        //compare password with bcrypt method, password and hashed password both are required
        bcrypt.compare(reqPassword, userPassword, function (err, isMatch) {
            if (err) reject(err);
            resolve(isMatch);
        });
    });
};
/**
 * Method to generate jwt token
 */
let _generateUserToken = (tokenData) => {
    //create a new instance for jwt service
    let tokenService = new jwtService();
    let token = tokenService.createJwtAuthenticationToken(tokenData);
    return token;
};
/**
 * Method to generate jwt token
 */
let _generateVerificationToken = (tokenData, verification_type) => {
    //create a new instance for jwt service
    let tokenService = new jwtService();
    let token = tokenService.createJwtVerificationToken(tokenData, verification_type);
    return token;
};
/**
 * Method to update user Email verification Database
 */
let _handleVerificationDataUpdate = async (id) => {
    log.info('Received request for deleting verification token::', id);
    let deletedInfo = await verificationDbHandler.deleteById(id);
    return deletedInfo;
};

let _encryptPassword = (password) => {
    let salt = config.bcrypt.saltValue;
    // generate a salt
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(salt, function (err, salt) {
            if (err) reject(err);
            // hash the password with new salt
            bcrypt.hash(password, salt, function (err, hash) {
                if (err) reject(err);
                // override the plain password with the hashed one
                resolve(hash);
            });
        });
    });
};

let acceptedMedias = ["x.com", "linkedin.com", "facebook.com", "first_youtube", "second_youtube", "third_youtube", "share_first_youtube", "share_second_youtube", "share_third_youtube", "instagram.com"]

function checkMediaExistence(input) {
    const lowercasedInput = input.toLowerCase()
    const existingMedia = acceptedMedias.filter(media => lowercasedInput.includes(media));
    return existingMedia || null
}
/**************************
 * END OF PRIVATE FUNCTIONS
 **************************/
module.exports = {

    socialMediaVerification: async (req, res) => {
        let responseData = {};
        let user = req.user;
        let user_id = user.sub;
        let url = req.body.link
        try {

            if (!url) throw "Invalid URL!"

            // Matching if the mediaType Exists
            let mediaType = checkMediaExistence(url)
            if (mediaType.length === 0) throw "Invalid URl!"
            mediaType = (mediaType[mediaType.length - 1]).split(".")[0]
            if (!mediaType) throw "Wrong Media Type !!!"

            // Check if the particular media is already true
            const user = await userDbHandler.getById(user_id)
            if (user?.extra[`${mediaType}`] === true) {
                responseData.msg = "Already Verified!";
                return responseHelper.error(res, responseData);
            }

            // Check if its of youtube
            if (mediaType.includes("youtube")) {

                await userDbHandler.updateOneByQuery(
                    { _id: user_id },
                    {
                        $set: {
                            [`extra.${mediaType}`]: true
                        }
                    }
                ).then(() => {
                    user.extra[`${mediaType}`] = true
                }).catch(e => { throw `Error while creating income ${e}` })

                if (
                    !user?.extra?.first_youtube ||
                    !user?.extra?.second_youtube ||
                    !user?.extra?.third_youtube ||
                    !user?.extra?.share_first_youtube ||
                    !user?.extra?.share_second_youtube ||
                    !user?.extra?.share_third_youtube
                ) {
                    responseData.msg = `Thanks for ${!mediaType.includes("share") ? "Sharing!" : "Watching!"}`;
                    return responseHelper.success(res, responseData);
                }
            }

            // check if the url is already used!!!
            const ifLinkMatched = await socialLinksDbHandler.getOneByQuery({ url })
            if (ifLinkMatched) {
                responseData.msg = "Outdated Posts Not Allowed!";
                return responseHelper.error(res, responseData);
            }

            // STOPPED VERIFICATION
            // if (!mediaType.includes("x")
            //     &&
            //     !mediaType.includes("youtube")
            //     &&
            //     !mediaType.includes("facebook")) {

            //     const response = await fetch(config.socialMediaVerificationEndpoint + "?URL=" + url, { method: "GET" });
            //     if (!response.ok)
            //         throw new Error('Network response was not ok')
            //     const data = await response.json()
            //     if (data.response === null || !data.response.includes(user_id)) throw "Unable to find match of refID in the provided URL !!!"
            // }

            // give income/token too
            const { value, extra } = await settingDbHandler.getOneByQuery({ name: "tokenDistribution" });
            // STATIC CODE for this condition
            // check if the user has a token more than 10$ then divide by 2
            let finVal = value
            if (user?.extra?.tokens >= 10) {
                finVal = value / 2
            }
            const tokens = parseFloat(finVal)
            const levels = extra?.levels

            if (!mediaType.includes("youtube"))
                await socialLinksDbHandler.create(
                    {
                        user_id,
                        url
                    }
                ).catch(e => { throw `Error while saving the URL log ${e}` })


            await userDbHandler.updateOneByQuery(
                { _id: user_id },
                {
                    $set: {
                        [`extra.${mediaType}`]: true
                    },
                    $inc: {
                        "wallet": tokens,
                        "extra.tokens": tokens,
                        "extra.tasksIncome": tokens,
                        "extra.totalIncome": tokens
                    }
                }
            ).catch(e => { throw `Error while creating income ${e}` })

            await incomeDbHandler.create(
                {
                    user_id: user_id,
                    amount: tokens,
                    extra: {
                        mediaType: mediaType.includes("youtube") ? "youtube" : mediaType
                    },
                    type: 0,
                    wamt: tokens,
                    iamount: tokens,
                    date: Number(Date.now()),
                }
            ).catch(e => { throw `Error while creating income log ${e}` })

            await levelIncome(user_id, levels, tokens);

            responseData.msg = "Link Verified Successfully!";
            return responseHelper.success(res, responseData);

        } catch (error) {
            log.error('SOCIAL VERIFICATION, failed to fetch data with error::', error);
            responseData.msg = error;
            return responseHelper.error(res, responseData);
        }
    },

    /**
     * Method to get User Profile
     */
    profile: async (req, res) => {
        let user = req.user;
        let id = user.sub;
        log.info('Recieved request for User Profile for User:', user);
        let responseData = {};
        try {
            let userData = await userDbHandler.getById(id, { password: 0 });
            responseData.msg = `Data Fetched Successfully !`;
            responseData.data = userData;
            return responseHelper.success(res, responseData);

        } catch (error) {
            log.error('failed to get user with error::', error);
            responseData.msg = 'Failed to get user login';
            return responseHelper.error(res, responseData);
        }
    },

    /**
     *  Method to update Profile
     */
    updateProfile: async (req, res) => {
        let reqObj = req.body;
        let user = req.user;
        let id = user.sub;
        log.info('Recieved request for User Profile update:', reqObj);
        let responseData = {};
        try {
            let userData = await userDbHandler.getById(id, { password: 0 });
            if (!userData) {
                responseData.msg = 'Invalid user!';
                return responseHelper.error(res, responseData);
            }

            let checkEmail = await userDbHandler.getByQuery({ _id: { $ne: id }, email: reqObj?.email });
            let checkPhoneNumber = await userDbHandler.getByQuery({ _id: { $ne: id }, phone_number: reqObj?.phone_number });

            if (reqObj.phone_number != undefined && checkPhoneNumber.length >= config.phoneCheck) {
                responseData.msg = 'Phone Number Already Exist !';
                return responseHelper.error(res, responseData);
            }
            if (reqObj.email != undefined && checkEmail.length >= config.emailCheck) {
                responseData.msg = 'Email Already Exist !';
                return responseHelper.error(res, responseData);
            }

            let avatar = userData.avatar;
            if (req.file) {
                avatar = req.file.location;
            }
            let updatedObj = {
                name: reqObj?.name,
                address: reqObj?.address,
                dob: reqObj?.dob,
                phone_number: reqObj?.phone_number,
                wallet_address: reqObj?.wallet_address,
                country: reqObj?.country,
                country_code: reqObj?.country_code,
                state: reqObj?.state,
                city: reqObj?.city,
                avatar: avatar
            }
            if (config.loginByType != 'email' && reqObj?.email) {
                updatedObj.email = reqObj?.email;
            }
            if (config.loginByType != 'address' && reqObj?.address) {
                updatedObj.address = reqObj?.address;
            }
            await userDbHandler.updateById(id, updatedObj);
            let userUpdatedData = await userDbHandler.getById(id, { password: 0 });
            responseData.data = userUpdatedData;
            responseData.msg = `Data updated sucessfully !`;
            return responseHelper.success(res, responseData);

        } catch (error) {
            log.error('failed to get user signup with error::', error);
            responseData.msg = 'Failed to get user login';
            return responseHelper.error(res, responseData);
        }
    },

    /**
     * Method to handle change password
     */
    changePassword: async (req, res) => {
        let reqObj = req.body;
        let user = req.user;
        let id = user.sub;
        log.info('Recieved request for User Profile update:', reqObj);
        let responseData = {};
        try {
            let userData = await userDbHandler.getById(id);
            let comparePassword = await _comparePassword(reqObj.old_password, userData.password);
            if (!comparePassword) {
                responseData.msg = `Invalid old password !`;
                return responseHelper.error(res, responseData);
            }
            let compareNewAndOld = await _comparePassword(reqObj.password, userData.password);
            if (compareNewAndOld) {
                responseData.msg = `New password must be different from old password !`;
                return responseHelper.error(res, responseData);
            }
            let updatedObj = {
                password: await _encryptPassword(reqObj.password)
            }
            await userDbHandler.updateById(id, updatedObj);
            responseData.msg = `Data updated sucessfully !`;
            return responseHelper.success(res, responseData);

        } catch (error) {
            log.error('failed to update with error::', error);
            responseData.msg = 'Failed to update data';
            return responseHelper.error(res, responseData);
        }
    },

    logout: async (req, res) => {
        let user = req.user;
        let id = user.sub;
        log.info('Recieved request for User Logout for User:', user);
        let responseData = {};
        try {
            responseData.msg = `Logout Successfully !`;
            return responseHelper.success(res, responseData);

        } catch (error) {
            log.error('failed to logout with error::', error);
            responseData.msg = 'Failed to logout user';
            return responseHelper.error(res, responseData);
        }
    },

};