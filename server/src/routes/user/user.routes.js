const Router = require('express').Router();
/**
 * All Controllers
 */
const {
    userAuthController,
    userInfoController,
    userController,
    user2FAController,
    userSupportController,
    userDepositController,
    userFundTransferController,
    userIncomeController,
    userInvestmentController,
    userInvestmentPlanController,
    userMessageController,
    userSettingController,
    userWithdrawalController
} = require('../../controllers');

/**
 * All Middlewares
 */

const {
    userAuthenticateMiddleware,
    verificationMiddleware,
    validationMiddleware,
    user2FaMiddleware
} = require("../../middlewares");

/**
 * Validations
 */

const {
    userAuthValidation,
    userInfoValidation,
    userValidation,
    twoFaValidation,
    supportValidation,
    depositValidation,
    fundDeductValidation,
    fundTransferValidation,
    incomeValidation,
    investmentValidation,
    investmentPlanValidation,
    messageValidation,
    withdrawalValidation,
    settingValidation
} = require("../../validations");

const multerService = require('../../services/multer');

module.exports = () => {

    /***************************
     * UPLOAD FILE ROUTES 
     ***************************/

    Router.post('/user/upload', multerService.uploadFile('file').single('file'), (req, res) => {
        return res.send(req.file.location);
    });

    /***************************
     * START UNAUTHORIZED ROUTES
     ***************************/
    /*
     **Login and Signup Route
     */
    Router.post(
        '/user/login',
        validationMiddleware(userAuthValidation.login, 'body'),
        userAuthController.login
    );

    Router.post(
        '/user/login/request',
        validationMiddleware(userAuthValidation.userLoginRequest, 'body'),
        userAuthController.userLoginRequest
    );

    Router.post(
        '/user/login_step_2',
        [user2FaMiddleware, validationMiddleware(userAuthValidation.loginStep2, 'body')],
        userAuthController.loginStep2
    );

    Router.post(
        '/user/signup',
        validationMiddleware(userAuthValidation.signup, 'body'),
        userAuthController.signup
    );
    Router.post(
        '/user/checkReferID',
        validationMiddleware(userAuthValidation.checkReferID, 'body'),
        userAuthController.checkReferID
    );
    Router.post(
        '/user/forgot/password',
        validationMiddleware(userAuthValidation.forgotPassword, 'body'),
        userAuthController.forgotPassword
    );
    Router.post(
        '/user/reset/password', [
        validationMiddleware(userAuthValidation.resetPassword, 'body'),
    ],
        userAuthController.resetPassword
    );
    /**
     * Email verification Route
     */
    Router.get(
        '/email/u/verification', [
        validationMiddleware(userAuthValidation.verifyEmail, 'query'),
        verificationMiddleware,
    ],
        userAuthController.verifyEmail
    );

    Router.post(
        '/reg/email/u/verification',
        validationMiddleware(userAuthValidation.resendEmailVerification, 'body'),
        userAuthController.resendEmailVerification
    );

    /****************************
     * END OF UNAUTHORIZED ROUTES
     ****************************/

    /**********************
     * AUTHORIZED ROUTES
     **********************/
    /**
     * Middlerware for Handling Request Authorization
     */
    Router.use('/', userAuthenticateMiddleware);

    /**
     * Routes for handling user profile
     */
    Router.get('/user/logout', userInfoController.logout);
    Router.get('/user/profile', userInfoController.profile);
    Router.post('/socialMediaVerification/', userInfoController.socialMediaVerification)
    Router.put('/user/update_profile', [multerService.uploadFile('avatar').single('avatar'), validationMiddleware(userInfoValidation.updateProfile, 'body')], userInfoController.updateProfile);
    // Router.put('/user/update_profile', userInfoController.updateProfile);

    Router.post('/user/generate-2fa-secret', user2FAController.generate2faSecret);
    Router.post('/user/verify-otp', validationMiddleware(twoFaValidation.verifyOtp, 'body'), user2FAController.verifyOtp);
    Router.post('/user/disable-2fa', validationMiddleware(twoFaValidation.disable2fa, 'body'), user2FAController.disable2fa);

    /**
     * Routes for handle change password
     */
    Router.put('/user/change_password', validationMiddleware(userInfoValidation.changePassword, 'body'), userInfoController.changePassword);


    Router.get("/get-user-direct", userController.getAll);
    Router.get("/get-user-downline", userController.getDownline);
    Router.get("/get-user-downline-length", userController.getDownlineLength);

    Router.get("/get-all-messages-inbox", userMessageController.getAllInbox);
    Router.get("/get-all-messages-sent", userMessageController.getAllSent);
    Router.get("/get-message/:id", userMessageController.getOne);
    Router.get("/get-message-count", userMessageController.getCount);
    Router.post("/add-message", validationMiddleware(messageValidation.add, 'body'), userMessageController.add);
    Router.put("/update-message", validationMiddleware(messageValidation.update, 'body'), userMessageController.update);

    Router.get("/get-all-settings", userSettingController.getAll);
    Router.get("/get-setting/:id", userSettingController.getOne);
    Router.get("/get-setting-with-name/:name", userSettingController.getOneByQuery);
    Router.post("/getObject", userSettingController.getObject);


    Router.get("/get-all-investment-plans", userInvestmentPlanController.getAll);
    Router.get("/get-investment-plan/:id", userInvestmentPlanController.getOne);

    Router.get("/get-all-investments", userInvestmentController.getAll);
    Router.get("/get-investment/:id", userInvestmentController.getOne);
    Router.get("/get-investment-sum", userInvestmentController.getSum);
    Router.post("/add-investment", validationMiddleware(investmentValidation.add, 'body'), userInvestmentController.add);

    Router.get("/get-all-incomes", userIncomeController.getAll);
    Router.get("/get-income/:id", userIncomeController.getOne);
    Router.get("/get-income-sum", userIncomeController.getSum);

    Router.get("/get-all-fund-transfers", userFundTransferController.getAll);
    Router.get("/get-fund-transfer/:id", userFundTransferController.getOne);
    Router.get("/get-fund-transfer-sum", userFundTransferController.getSum);
    Router.post("/add-fund-transfer", validationMiddleware(fundTransferValidation.add, 'body'), userFundTransferController.add);

    Router.get("/get-all-deposits", userDepositController.getAll);
    Router.get("/get-deposit/:id", userDepositController.getOne);
    Router.get("/get-deposit-sum", userDepositController.getSum);
    Router.post("/add-deposit", validationMiddleware(depositValidation.add, 'body'), userDepositController.add);

    Router.get("/get-all-withdrawals", userWithdrawalController.getAll);
    Router.get("/get-withdrawal/:id", userWithdrawalController.getOne);
    Router.get("/get-withdrawal-sum", userWithdrawalController.getSum);
    Router.post("/add-withdrawal", validationMiddleware(withdrawalValidation.add, 'body'), userWithdrawalController.add);

    /**
    * Routes for handle support
    */

    Router.post("/support", validationMiddleware(supportValidation.add, "body"), userSupportController.add);

    /**************************
     * END OF AUTHORIZED ROUTES
     **************************/
    return Router;
};