'use strict';
const logger = require('../../services/logger');
const log = new logger('AuthController').getChildLogger();
const { userDbHandler, verificationDbHandler, userLoginRequestDbHandler } = require('../../services/db');
const { getPlacementId, getTerminalId } = require('../../services/commonFun');
const bcrypt = require('bcryptjs');
const config = require('../../config/config');
const jwtService = require('../../services/jwt');
const emailService = require('../../services/sendEmail');
const responseHelper = require('../../utils/customResponse');
const templates = require('../../utils/templates/template');
const { authenticator } = require("otplib");
const crypto = require('crypto');
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId
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
let _generateUserToken = (tokenData, exp = 0) => {
    //create a new instance for jwt service
    let tokenService = new jwtService();
    let token = tokenService.createJwtAuthenticationToken(tokenData, exp);
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

let generateRandomPassword = (length) => {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
    let password = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters.charAt(randomIndex);
    }

    return password;
};

/**************************
 * END OF PRIVATE FUNCTIONS
 **************************/
module.exports = {
    /**
     * Method to handle user login
     */
    login: async (req, res) => {
        let reqObj = req.body;
        log.info('Recieved request for User Login:', reqObj);
        let responseData = {};
        try {
            let query = {};
            if (config.loginByType == 'email') {
                query.username = reqObj?.email.toLowerCase();
            }
            else if (config.loginByType == 'address') {
                query.username = reqObj?.address.toLowerCase();
            }
            else {
                query.username = reqObj?.username;
            }

            let getUser = await userDbHandler.getByQuery(query);
            if (!getUser.length) {
                // if we didn't got the user and the email entered matched with our env emails of the first user
                // then we will create him for the first time
                if (query.username === process.env.TOP_ID) {

                    let submitData = {
                        refer_id: null,
                        [`${config.loginByType}`]: query.username,
                        username: query.username,
                        password: reqObj?.password,
                        is_default: true
                    }
                    getUser = [await userDbHandler.create(submitData)]

                    // log.info('Top User created in the database collection', newUser);
                    // responseData.msg = "Top user created successfully, please try again !!!"
                    // return responseHelper.success(res, responseData);

                } else {
                    responseData.msg = "Invalid Credentials!";
                    return responseHelper.error(res, responseData);
                }
            }

            let checkPassword = (config.loginByType != 'address') ? await _comparePassword(reqObj?.password, getUser[0].password) : null;

            if (config.loginByType != 'address' && !checkPassword) {
                responseData.msg = "Invalid Credentials!";
                return responseHelper.error(res, responseData);
            }
            if (process.env.EMAIL_VERIFICATION === '1' && config.loginByType == 'email' && !getUser[0].email_verified) {
                responseData.msg = "Email not verified yet!";
                return responseHelper.error(res, responseData);
            }
            if (!getUser[0].status) {
                responseData.msg = "Your account is Disabled please contact to admin!";
                return responseHelper.error(res, responseData);
            }

            let time = new Date().getTime();

            let updatedObj = {
                force_relogin_time: time,
                force_relogin_type: 'session_expired'
            }
            await userDbHandler.updateById(getUser[0]._id, updatedObj);

            if (getUser[0]?.two_fa_enabled) {
                let returnResponse = {
                    two_fa_enabled: true,
                    loginStep2VerificationToken: await _generateUserToken({ email: getUser[0].email }, "5m"),
                };

                responseData.msg = `Please complete 2-factor authentication !`;
                responseData.data = returnResponse;
                return responseHelper.success(res, responseData);
            }
            else {
                let tokenData = {
                    sub: getUser[0]._id,
                    username: getUser[0].username,
                    email: getUser[0].email,
                    address: getUser[0].address,
                    name: getUser[0].name,
                    time: time
                };

                let token = _generateUserToken(tokenData);
                let returnResponse = {
                    user_id: getUser[0]._id,
                    //username: getUser[0].username,
                    name: getUser[0].name,
                    username: getUser[0].username,
                    email: getUser[0].email,
                    address: getUser[0].address,
                    email_verify: getUser[0].email_verified,
                    avatar: getUser[0]?.avatar,
                    token: token,
                    two_fa_enabled: getUser[0]?.two_fa_enabled
                }
                responseData.msg = `Welcome ${getUser[0].username} !`;
                responseData.data = returnResponse;
                return responseHelper.success(res, responseData);
            }

        } catch (error) {
            log.error('failed to get user signin with error::', error);
            responseData.msg = 'Failed to get user login';
            return responseHelper.error(res, responseData);
        }
    },

    /**
     * Method to handle user login request from Admin Side
     */
    userLoginRequest: async (req, res) => {
        let reqObj = req.body;
        log.info('Recieved request for User Login Request:', reqObj);
        let responseData = {}
        try {
            const loginRequest = await userLoginRequestDbHandler.getOneByQuery({ hash: reqObj.hash })
            if (!loginRequest) {
                log.error(`Invalid Hash!`)
                responseData.msg = `Invalid Hash!`
                return responseHelper.error(res, responseData)
            }

            let getUser = await userDbHandler.getByQuery({ _id: loginRequest?.user_id });
            if (!getUser.length) {
                responseData.msg = "Invalid Credentials!";
                return responseHelper.error(res, responseData);
            }

            let time = new Date().getTime();

            let updatedObj = {
                force_relogin_time: time,
                force_relogin_type: 'session_expired'
            }
            await userDbHandler.updateById(getUser[0]._id, updatedObj);

            // delete the login Request
            // await userLoginRequestDbHandler.deleteById(loginRequest?._id)

            let tokenData = {
                sub: getUser[0]._id,
                username: getUser[0].username,
                email: getUser[0].email,
                address: getUser[0].address,
                name: getUser[0].name,
                time: time
            };

            let token = _generateUserToken(tokenData);
            let returnResponse = {
                user_id: getUser[0]._id,
                //username: getUser[0].username,
                name: getUser[0].name,
                username: getUser[0].username,
                email: getUser[0].email,
                address: getUser[0].address,
                email_verify: getUser[0].email_verified,
                avatar: getUser[0]?.avatar,
                token: token,
                two_fa_enabled: getUser[0]?.two_fa_enabled
            }
            responseData.msg = `Welcome ${getUser[0].username} !`;
            responseData.data = returnResponse;
            return responseHelper.success(res, responseData);

        } catch (error) {
            log.error('failed to get user signin with error::', error);
            responseData.msg = 'Failed to get user login';
            return responseHelper.error(res, responseData);
        }
    },

    /**
     * Method to handle user login step2
     */
    loginStep2: async (req, res) => {
        let reqObj = req.body;
        log.info('Recieved request for User Login:', reqObj);
        let responseData = {};
        try {
            let query = {
                email: req.user.email
            }
            let getUser = await userDbHandler.getByQuery(query);
            if (!getUser.length) {
                responseData.msg = "Invalid Request!";
                return responseHelper.error(res, responseData);
            }
            if (!getUser[0].email_verified) {
                responseData.msg = "Email not verified yet!";
                return responseHelper.error(res, responseData);
            }
            if (!getUser[0].status) {
                responseData.msg = "Your account is Disabled please contact to admin!";
                return responseHelper.error(res, responseData);
            }

            const otp = req.body.two_fa_token.replaceAll(" ", "");

            if (!authenticator.check(otp, getUser[0].two_fa_secret)) {
                responseData.msg = "The entered OTP is invalid!";
                return responseHelper.error(res, responseData);
            } else {
                let time = new Date().getTime();

                let updatedObj = {
                    force_relogin_time: time,
                    force_relogin_type: 'session_expired'
                }
                await userDbHandler.updateById(getUser[0]._id, updatedObj);
                let tokenData = {
                    sub: getUser[0]._id,
                    username: getUser[0].username,
                    email: getUser[0].email,
                    address: getUser[0].address,
                    name: getUser[0].name,
                    time: time
                };

                let token = _generateUserToken(tokenData);
                let returnResponse = {
                    user_id: getUser[0]._id,
                    //username: getUser[0].username,
                    name: getUser[0].name,
                    username: getUser[0].username,
                    email: getUser[0].email,
                    address: getUser[0].address,
                    email_verify: getUser[0].email_verified,
                    avatar: getUser[0]?.avatar,
                    token: token,
                    two_fa_enabled: getUser[0]?.two_fa_enabled
                }
                responseData.msg = `Welcome ${getUser[0].username} !`;
                responseData.data = returnResponse;
                return responseHelper.success(res, responseData);
            }

        } catch (error) {
            log.error('failed to get user signup with error::', error);
            responseData.msg = 'Failed to get user login';
            return responseHelper.error(res, responseData);
        }
    },
    /**
     * Method to check If Refer ID exists
     */
    checkReferID: async (req, res) => {
        let responseData = {}

        try {
            if (!req.body?.refer_id) throw "Invalid Refer ID !!!"

            const user = await userDbHandler.getOneByQuery({ _id: ObjectId(req.body.refer_id) }, { _id: 1 })
            if (!user) throw "Invalid User !!!"

            responseData.msg = "Refer ID Verified Successfully!"
            responseData.data = {
                _id: user._id.toString()
            }
            return responseHelper.success(res, responseData);

        } catch (error) {
            log.error(`Error while verifying referID: ${error}`)
            responseData.msg = error
            return responseHelper.error(res, responseData);
        }


    },
    /**
     * Method to handle user signup
     */
    signup: async (req, res) => {
        let reqObj = req.body;
        log.info('Recieved request for User Signup:', reqObj);
        let responseData = {};
        console.log(reqObj);
        try {
            let query = {};
            if (config.loginByType == 'email') {
                query.username = reqObj?.email.toLowerCase();
            }
            else if (config.loginByType == 'address') {
                query.username = reqObj?.address.toLowerCase();
            }
            else {
                query.username = reqObj?.username;
            }
            let refer_id = reqObj?.refer_id;
            let position = reqObj?.position;
            if (!refer_id) {
                const defaultUser = await userDbHandler.getOneByQuery({ is_default: true }, { _id: 1 });
                refer_id = defaultUser._id;
            }

            let placement_id = reqObj?.placement_id ? reqObj?.placement_id : refer_id;

            let checkUsername = await userDbHandler.getByQuery(query);
            let checkEmail = await userDbHandler.getByQuery({ email: reqObj?.email });
            let checkPhoneNumber = await userDbHandler.getByQuery({ phone_number: reqObj?.phone_number });
            let referUser = await userDbHandler.getById(refer_id);

            if (checkUsername.length) {
                responseData.msg = `${config.loginByName} already exist!`;
                return responseHelper.error(res, responseData);
            }
            if (reqObj?.email && config.loginByType != 'address' && checkEmail.length >= config.emailCheck) {
                responseData.msg = 'Email already exist!';
                return responseHelper.error(res, responseData);
            }
            if (reqObj?.phone_number && config.loginByType != 'address' && checkPhoneNumber.length >= config.phoneCheck) {
                responseData.msg = 'Phone number already exist!';
                return responseHelper.error(res, responseData);
            }

            if (!referUser) {
                responseData.msg = 'Invailid refer ID!';
                return responseHelper.error(res, responseData);
            }

            let submitData = {
                refer_id: refer_id,
                placement_id: placement_id,
                username: query.username,
                email: reqObj?.email?.toLowerCase(),
                address: reqObj?.address?.toLowerCase(),
                password: reqObj?.password,
                device_token: reqObj?.device_token,
                name: reqObj?.name,
                phone_number: reqObj?.phone_number
            }

            let newUser = await userDbHandler.create(submitData);
            log.info('User created in the database collection', newUser);

            if (process.env.EMAIL_VERIFICATION === '1' && config.loginByType != 'address' && config.loginByType != 'username') {
                //patch token data obj
                let tokenData = {
                    email: newUser.email,
                    name: newUser.name,
                    username: newUser.username
                };

                let verificationType = 'email';
                //generate email verification token
                let emailVerificationToken = _generateVerificationToken(tokenData, verificationType);
                //send verification email after user successfully created
                //patch email verification templateBody
                let templateBody = {
                    type: verificationType,
                    token: emailVerificationToken,
                    name: newUser.username
                };
                let emailBody = {
                    recipientsAddress: newUser.email,
                    subject: `${config.brandName} Account Verification Link`,
                    body: templates.emailVerification(templateBody)
                };
                let emailInfo = await emailService.sendEmail(emailBody);
                if (emailInfo) {
                    log.info('email verification mail sent successfully', emailInfo);
                    let emailObj = {
                        token: emailVerificationToken,
                        user_id: newUser._id,
                        verification_type: verificationType
                    };
                    let newEmailVerification = await verificationDbHandler.create(emailObj);
                    log.info('new email verification entry created successfully in the database', newEmailVerification);
                    responseData.msg = 'Your account has been created successfully! Please verify your email. Verification link has been sent on your registered email Id';
                    return responseHelper.success(res, responseData);
                }
            }
            else {
                responseData.msg = "Your account has been created successfully!";
                return responseHelper.success(res, responseData);
            }
        } catch (error) {
            log.error('failed to get user signup with error::', error);
            responseData.msg = 'Failed to create user';
            return responseHelper.error(res, responseData);
        }
    },
    signupLR: async (req, res) => {
        let reqObj = req.body;
        log.info('Recieved request for User Signup:', reqObj);
        let responseData = {};
        console.log(reqObj);
        try {
            let query = {};
            if (config.loginByType == 'email') {
                query.username = reqObj?.email.toLowerCase();
            }
            else if (config.loginByType == 'address') {
                query.username = reqObj?.address.toLowerCase();
            }
            else {
                query.username = reqObj?.username;
            }
            let refer_id = reqObj?.refer_id;
            let position = reqObj?.position;
            if (!refer_id) {
                const defaultUser = await userDbHandler.getOneByQuery({ is_default: true }, { _id: 1 });
                refer_id = defaultUser._id;
            }

            let placement_id = reqObj?.placement_id ? reqObj?.placement_id : refer_id;

            if (position) {
                placement_id = await getTerminalId(refer_id, position);
            } else if (1) {
                placement_id = await getPlacementId(refer_id, 2);
            }


            let checkUsername = await userDbHandler.getByQuery(query);
            let checkEmail = await userDbHandler.getByQuery({ email: reqObj?.email });
            let checkPhoneNumber = await userDbHandler.getByQuery({ phone_number: reqObj?.phone_number });
            let referUser = await userDbHandler.getById(refer_id);

            /* NOT REQUIRED
            let checkIfExists = await userDbHandler.getByQuery({
                $or: [{
                    username: query.username
                }, {
                    email: query.username
                }, {
                    address: query.username
                }]
            })
            if (checkIfExists.length) {
                responseData.msg = `${config.loginByName} already exist!`;
                return responseHelper.error(res, responseData);
            }
            */

            if (checkUsername.length) {
                responseData.msg = `${config.loginByName} already exist!`;
                return responseHelper.error(res, responseData);
            }
            if (reqObj?.email && config.loginByType != 'address' && checkEmail.length >= config.emailCheck) {
                responseData.msg = 'Email already exist!';
                return responseHelper.error(res, responseData);
            }
            if (reqObj?.phone_number && config.loginByType != 'address' && checkPhoneNumber.length >= config.phoneCheck) {
                responseData.msg = 'Phone number already exist!';
                return responseHelper.error(res, responseData);
            }
            if (!referUser) {
                responseData.msg = 'Invailid refer ID!';
                return responseHelper.error(res, responseData);
            }

            let submitData = {
                refer_id: refer_id,
                placement_id: placement_id,
                username: query.username,
                email: reqObj?.email?.toLowerCase(),
                address: reqObj?.address?.toLowerCase(),
                password: reqObj?.password,
                name: reqObj?.name,
                phone_number: reqObj?.phone_number
            }

            if (position) {
                submitData['position'] = position
            }

            let newUser = await userDbHandler.create(submitData);
            log.info('User created in the database collection', newUser);

            if (process.env.EMAIL_VERIFICATION === '1' && config.loginByType != 'address' && config.loginByType != 'username') {
                //patch token data obj
                let tokenData = {
                    email: newUser.email,
                    name: newUser.name,
                    username: newUser.username
                };

                let verificationType = 'email';
                //generate email verification token
                let emailVerificationToken = _generateVerificationToken(tokenData, verificationType);
                //send verification email after user successfully created
                //patch email verification templateBody
                let templateBody = {
                    type: verificationType,
                    token: emailVerificationToken,
                    name: newUser.username
                };
                let emailBody = {
                    recipientsAddress: newUser.email,
                    subject: `${config.brandName} Account Verification Link`,
                    body: templates.emailVerification(templateBody)
                };
                let emailInfo = await emailService.sendEmail(emailBody);
                if (emailInfo) {
                    log.info('email verification mail sent successfully', emailInfo);
                    let emailObj = {
                        token: emailVerificationToken,
                        user_id: newUser._id,
                        verification_type: verificationType
                    };
                    let newEmailVerification = await verificationDbHandler.create(emailObj);
                    log.info('new email verification entry created successfully in the database', newEmailVerification);
                    responseData.msg = 'Your account has been created successfully! Please verify your email. Verification link has been sent on your registered email Id';
                    return responseHelper.success(res, responseData);
                }
            }
            else {
                responseData.msg = "Your account has been created successfully!";
                return responseHelper.success(res, responseData);
            }
        } catch (error) {
            log.error('failed to get user signup with error::', error);
            responseData.msg = 'Failed to create user';
            return responseHelper.error(res, responseData);
        }
    },
    /**
     * Method to handle forgot password by email
     */
    forgotPassword: async (req, res) => {
        let reqBody = req.body;
        log.info('Recieved request for User forgot password:', reqBody);
        let userEmail = reqBody.email;
        let responseData = {};
        let isVerificationDataExists = false;
        try {
            let query = {
                email: userEmail,
                login_way: 'local'
            };
            let userData = await userDbHandler.getByQuery(query);
            if (!userData.length) {
                log.error('user email doesnot exist for forget password request');
                responseData.msg = 'User is not registered with us please register yourself!';
                return responseHelper.error(res, responseData);
            }
            // if (!userData[0].email_verified) {
            //     responseData.msg = "Email not verified yet!";
            //     return responseHelper.error(res, responseData);
            // }
            if (!userData[0].status) {
                responseData.msg = "Your account is Disabled please contact to admin!";
                return responseHelper.error(res, responseData);
            }
            let tokenData = {
                email: userData[0].email
            };
            let verificationType = 'password';
            //generate password verification token
            let passwordResetToken = _generateVerificationToken(tokenData, verificationType);
            //check if user already have forgot password request data in verification collection
            let passwordQuery = {
                user_id: userData[0]._id,
                verification_type: verificationType
            };
            let passwordTokenInfo = await verificationDbHandler.getByQuery(passwordQuery);
            //if password verification data found update it with new token, else create new entry
            if (passwordTokenInfo.length) {
                isVerificationDataExists = true;
                let updatePasswordVerificationObj = {
                    token: passwordResetToken,
                    attempts: passwordTokenInfo[0].attempts + 1
                };
                let updateQuery = {
                    _id: passwordTokenInfo[0]._id,
                };
                let option = {
                    upsert: false
                };
                let updatedVerificationData = await verificationDbHandler.updateByQuery(updateQuery, updatePasswordVerificationObj, option);
                log.info('password verification token updated in the db', updatedVerificationData);
            }
            //patch email verification templateBody
            let templateBody = {
                type: verificationType,
                token: passwordResetToken
            };
            let emailBody = {
                recipientsAddress: userData[0].email,
                subject: `${config.brandName} Forgot Password Link`,
                body: templates.passwordReset(templateBody)
            };
            let emailInfo = await emailService.sendEmail(emailBody).catch(e => { throw `Error while sending mail: ${e}` })
            if (!isVerificationDataExists) {
                // log.info('password reset mail sent successfully', emailInfo);
                let passwordResetObj = {
                    token: passwordResetToken,
                    user_id: userData[0]._id,
                    verification_type: verificationType
                };
                let newPasswordVerification = await verificationDbHandler.create(passwordResetObj);
                log.info('new forgot password entry created successfully in the database', newPasswordVerification);
            }
            responseData.msg = 'Email validated';
            responseData.data = templateBody;
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to process forget password request with error::', error);
            responseData.msg = 'Failed to process forget password request';
            return responseHelper.error(res, responseData);
        }
    },
    resetPassword: async (req, res) => {
        let reqBody = req.body;
        let resetPasswordToken = reqBody.token;
        log.info('Recieved request for password reset====>:', resetPasswordToken, reqBody);
        let newPassword = reqBody.password;
        let responseData = {};
        try {
            let query = {
                token: resetPasswordToken,
                verification_type: 'password'
            };
            let passwordTokenInfo = await verificationDbHandler.getByQuery(query);
            if (!passwordTokenInfo.length) {
                log.error('Invalid password reset token:', resetPasswordToken);
                responseData.msg = 'Invalid Password reset request or token expired';
                return responseHelper.error(res, responseData);
            }
            log.info("tokenInfo", passwordTokenInfo);
            let userId = passwordTokenInfo[0].user_id;
            let userDetail = await userDbHandler.getById(userId);
            let comparePassword = await _comparePassword(newPassword, userDetail.password);
            console.log("compare_password===>", comparePassword);
            if (comparePassword) {
                log.error('Use old password:', newPassword);
                responseData.msg = 'New password can not be same as old password';
                return responseHelper.error(res, responseData);
            }

            let encryptedPassword = await _encryptPassword(newPassword);
            let updateUserQuery = {
                password: encryptedPassword
            };
            let updatedUser = await userDbHandler.updateById(userId, updateUserQuery);
            if (!updatedUser) {
                log.error('failed to reset user password', updatedUser);
                responseData.msg = 'Failed to reset password';
                return responseHelper.error(res, responseData);
            }
            //delete the password token from db;
            let removedTokenInfo = await _handleVerificationDataUpdate(passwordTokenInfo[0]._id);
            log.info('password verification token has been removed::', removedTokenInfo);
            responseData.msg = 'Password updated successfully! Please Login to continue';
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to reset password with error::', error);
            responseData.msg = 'Failed to reset password';
            return responseHelper.error(res, responseData);
        }
    },
    /**
     * Method to handle email token verification
     */
    verifyEmail: async (req, res) => {
        let emailToken = req.emailToken;
        log.info('Received request for email verification ::', emailToken);
        let responseData = {};
        try {
            let query = {
                token: emailToken,
                verification_type: 'email'
            };
            let emailInfo = await verificationDbHandler.getByQuery(query);
            if (!emailInfo.length) {
                responseData.msg = 'Invalid email verification request or token expired';
                return responseHelper.error(res, responseData);
            }
            //update user email verification status
            let userId = emailInfo[0].user_id;
            let updateObj = {
                email_verified: true
            };
            let updatedUser = await userDbHandler.updateById(userId, updateObj);
            if (!updatedUser) {
                log.info('failed to verify user email');
                responseData.msg = 'Failed to verify email';
                return responseHelper.error(res, responseData);
            }
            log.info('user email verification status updated successfully', updatedUser);
            let removedTokenInfo = await _handleVerificationDataUpdate(emailInfo[0]._id);
            log.info('email verification token has been removed::', removedTokenInfo);
            responseData.msg = 'Your email has been successfully verified! Please login to continue';
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to process email verification::', error);
            responseData.msg = 'Failed to verify user email';
            return responseHelper.error(res, responseData);
        }
    },
    /**
     * Method to handle resend email verification link
     */
    resendEmailVerification: async (req, res) => {
        let reqBody = req.body;
        log.info('Received request for handling resend email verification link:', reqBody);
        let responseData = {};
        let userEmail = reqBody.email;
        try {
            let query = {
                email: userEmail
            };
            //check if user email is present in the database, then onlyy process the request
            let userData = await userDbHandler.getByQuery(query);
            //if no user found, return error
            if (!userData.length) {
                responseData.msg = 'Invalid Email Id';
                return responseHelper.error(res, responseData);
            }
            let verificationType = 'email';
            let emailQuery = {
                user_id: userData[0]._id,
                verification_type: verificationType
            };
            let emailTokenInfo = await verificationDbHandler.getByQuery(emailQuery);
            if (!emailTokenInfo.length) {
                log.error('Pre saved email token info not found!');
                responseData.msg = 'Invalid request';
                return responseHelper.error(res, responseData);
            }
            //Allow maximum of 2 resend attempts only
            if (emailTokenInfo[0].attempts >= 2) {
                log.error('maximum resend email attempts');
                //responseData.msg = 'Maximum resend attempts';
                responseData.msg = 'You have exceeded the maximum number of attempts. Please try again after 24 hours.';
                return responseHelper.error(res, responseData);
            }

            let password = generateRandomPassword(8);
            let updatedObj = {
                password: await _encryptPassword(password)
            }
            await userDbHandler.updateById(userData[0]._id, updatedObj);

            let tokenData = {
                email: userData[0].email,
            };
            //generate new email verification token
            let newEmailVerificationToken = _generateVerificationToken(tokenData, verificationType);
            //send verification email after user successfully created
            //patch email verification templateBody
            let templateBody = {
                type: verificationType,
                token: newEmailVerificationToken,
                name: userData[0].username,
                password: password
            };
            let emailBody = {
                recipientsAddress: userData[0].email,
                subject: 'Resend: A link to verify your email',
                body: templates.emailVerificationUser(templateBody)
            };
            let emailInfo = await emailService.sendEmail(emailBody);
            if (!emailInfo) {
                log.error('failed to resend email verification mail');
                responseData.msg = 'Failed to send email verification email';
                return responseHelper.error(res, responseData);
            }
            log.info('new email verification mail sent successfully', emailInfo);
            let updateEmailVerificationObj = {
                token: newEmailVerificationToken,
                attempts: emailTokenInfo[0].attempts + 1
            };
            let updateQuery = {
                _id: emailTokenInfo[0]._id
            };
            let option = {
                upsert: false
            };
            let updatedEmailVerification = await verificationDbHandler.updateByQuery(updateQuery, updateEmailVerificationObj, option);
            if (!updatedEmailVerification) {
                log.info('failed to update email verification updated successfully in the database', updatedEmailVerification);
            }
            log.info('email verification updated successfully in the database', updatedEmailVerification);
            //update response data
            responseData.msg = 'Email verification link has been sent successfully';
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to resend email verification link with error::', error);
            responseData.msg = 'Failed to resend verification link';
            return responseHelper.error(res, responseData);
        }
    }
};