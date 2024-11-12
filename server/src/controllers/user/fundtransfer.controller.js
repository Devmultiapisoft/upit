'use strict';
const logger = require('../../services/logger');
const log = new logger('FundTransferController').getChildLogger();
const { fundTransferDbHandler, userDbHandler } = require('../../services/db');
const { getWalletField } = require('../../services/commonFun');
const responseHelper = require('../../utils/customResponse');
const config = require('../../config/config');

module.exports = {

    getAll: async (req, res) => {
        let reqObj = req.query;
        let user = req.user;
        let user_id = user.sub;
        log.info('Recieved request for getAll:', reqObj);
        let responseData = {};
        try {
            let getList = await fundTransferDbHandler.getAll(reqObj, user_id);
            responseData.msg = 'Data fetched successfully!';
            responseData.data = getList;
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to fetch data with error::', error);
            responseData.msg = 'Failed to fetch data';
            return responseHelper.error(res, responseData);
        }
    },

    getOne: async (req, res) => {
        let responseData = {};
        let user = req.user;
        let user_id = user.sub;
        let id = req.params.id;
        try {
            let getData = await fundTransferDbHandler.getById(id);
            responseData.msg = "Data fetched successfully!";
            responseData.data = getData;
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to fetch data with error::', error);
            responseData.msg = 'Failed to fetch data';
            return responseHelper.error(res, responseData);
        }
    },

    add: async (req, res) => {
        let responseData = {};
        let user = req.user;
        let user_id = user.sub;
        let reqObj = req.body;
        try {
            let min = 10;
            let max = 1000000;
            let fee = reqObj.amount * 0;
            let net_amount = reqObj.amount - fee;
            let user = await userDbHandler.getById(user_id);
            let userTo = await userDbHandler.getById(reqObj.user_id);
            let type = reqObj.type;
            let typeTo = reqObj.type_to;
            let walletFieldArr = getWalletField();
            let walletField = walletFieldArr[type];
            let walletFieldTo = walletFieldArr[typeTo];
            let wallet = user[walletField];

            if(!userTo){
                responseData.msg = `Invailid User!`;
                return responseHelper.error(res, responseData);
            }

            if (user.topup <= 0) {
                responseData.msg = `Please topup your account!`;
                return responseHelper.error(res, responseData);
            }
            if (wallet < reqObj.amount) {
                responseData.msg = `Insufficient fund!`;
                return responseHelper.error(res, responseData);
            } 
            if (reqObj.amount < min) {
                responseData.msg = `Minimum fund transfer ${min}!`;
                return responseHelper.error(res, responseData);
            } 
            if (reqObj.amount > max) {
                responseData.msg = `Maximum fund transfer ${max}!`;
                return responseHelper.error(res, responseData);
            } 
            if (reqObj.amount % min) {
                responseData.msg = `Request Multiple of ${min}!`;
                return responseHelper.error(res, responseData);
            }
            if (reqObj.user_id != user_id && walletField != 'wallet_topup' && walletFieldTo != 'wallet_topup') {
                responseData.msg = `Transfer user to user only topup wallet!`;
                return responseHelper.error(res, responseData);
            }
            if (reqObj.user_id == user_id && walletField != 'wallet' && walletFieldTo != 'wallet_topup') {
                responseData.msg = `Transfer only wallet to topup wallet!`;
                return responseHelper.error(res, responseData);
            }

            if(walletField == 'wallet_topup' && walletFieldTo == 'wallet_topup'){
                await userDbHandler.updateById(user_id, { $inc: { wallet_topup: -reqObj.amount } });
                await userDbHandler.updateById(reqObj.user_id, { $inc: { wallet_topup: net_amount } });
            }
            else if(walletField == 'wallet' && walletFieldTo == 'wallet'){
                await userDbHandler.updateById(user_id, { $inc: { wallet: -reqObj.amount } });
                await userDbHandler.updateById(reqObj.user_id, { $inc: { wallet: net_amount } });
            }
            else if(walletField == 'wallet' && walletFieldTo == 'wallet_topup'){
                await userDbHandler.updateById(user_id, { $inc: { wallet: -reqObj.amount } });
                await userDbHandler.updateById(reqObj.user_id, { $inc: { wallet_topup: net_amount } });
            }
            else{
                responseData.msg = `Invailid request!`;
                return responseHelper.error(res, responseData);
            }

            let data = {
                user_id: reqObj.user_id,
                user_id_from: user_id,
                amount: reqObj.amount,
                fee: fee,
                remark: reqObj.remark,
                type: reqObj.type,
            }

            await fundTransferDbHandler.create(data);
            responseData.msg = "Data added successfully!";
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to update data with error::', error);
            responseData.msg = "Failed to add data";
            return responseHelper.error(res, responseData);
        }
    },

    getCount: async (req, res) => {
        let responseData = {};
        let user = req.user;
        let user_id = user.sub;
        let reqObj = req.query;
        try {
            let getData = await fundTransferDbHandler.getCount(reqObj, user_id);
            responseData.msg = "Data fetched successfully!";
            responseData.data = getData;
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to fetch data with error::', error);
            responseData.msg = 'Failed to fetch data';
            return responseHelper.error(res, responseData);
        }
    },

    getSum: async (req, res) => {
        let responseData = {};
        let user = req.user;
        let user_id = user.sub;
        let reqObj = req.query;
        try {
            let getData = await fundTransferDbHandler.getSum(reqObj, user_id);
            responseData.msg = "Data fetched successfully!";
            responseData.data = getData;
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to fetch data with error::', error);
            responseData.msg = 'Failed to fetch data';
            return responseHelper.error(res, responseData);
        }
    }
};