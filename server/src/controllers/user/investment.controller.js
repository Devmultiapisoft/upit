'use strict';
const logger = require('../../services/logger');
const log = new logger('InveatmentController').getChildLogger();
const { investmentDbHandler, investmentPlanDbHandler, userDbHandler, incomeDbHandler, settingDbHandler } = require('../../services/db');
const { getTopLevelByRefer } = require('../../services/commonFun');
const responseHelper = require('../../utils/customResponse');
const config = require('../../config/config');

const { userModel } = require('../../models');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const { now } = require('mongoose')

module.exports = {

    getAll: async (req, res) => {
        let reqObj = req.query;
        let user = req.user;
        let user_id = user.sub;
        log.info('Recieved request for getAll:', reqObj);
        let responseData = {};
        try {
            let getList = await investmentDbHandler.getAll(reqObj, user_id);
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
            let getData = await investmentDbHandler.getById(id);
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
        user_id = { _id: ObjectId(user_id) }
        let reqObj = req.body;
        try {
            let investment_plan_id = reqObj.investment_plan_id;
            let user_id_to = reqObj?.user_id ? reqObj?.user_id : user_id;
            let plan = await investmentPlanDbHandler.getById(investment_plan_id);
            let user = await userDbHandler.getById(user_id);
            let userTo = await userDbHandler.getById(user_id_to);
            let wallet = user.wallet_topup;
            let min = plan.amount_from;
            let max = plan.amount_to;
            let mul = 1;
            let rate = 1;
            let amount = reqObj?.amount ? reqObj.amount : plan.amount_from;
            let amount_coin = amount * rate;
            let bonus = 0;

            if (!plan) {
                responseData.msg = `Invalid Plan!`;
                return responseHelper.error(res, responseData);
            }
            if (!userTo) {
                responseData.msg = `Invalid User!`;
                return responseHelper.error(res, responseData);
            }
            if (wallet < amount) {
                responseData.msg = `Insufficient fund!`;
                return responseHelper.error(res, responseData);
            }
            if (amount < min) {
                responseData.msg = `Minimum investment ${min}!`;
                return responseHelper.error(res, responseData);
            }
            if (amount > max) {
                responseData.msg = `Maximum investment ${max}!`;
                return responseHelper.error(res, responseData);
            }
            if (amount % mul) {
                responseData.msg = `Investment multiple of ${mul}!`;
                return responseHelper.error(res, responseData);
            }

            /*if(plan.type < userTo.package){
                responseData.msg = `Invalid package!`;
                return responseHelper.error(res, responseData);
            }
            if(userTo.topup > 0){
                responseData.msg = `You have already topup!`;
                return responseHelper.error(res, responseData);
            }*/

            await userDbHandler.updateOneByQuery(user_id,
                {
                    $inc: { wallet_topup: -amount }
                }
            ).then(async response => {

                if (!response.acknowledged || response.modifiedCount === 0) throw `Amount not deducted !!!`

                await userDbHandler.updateOneByQuery({ _id: user_id_to },
                    {
                        $inc: { topup: amount },
                        $set: { "extra.package": plan.type }
                    }
                ).then(async response => {
                    if (!response.acknowledged || response.modifiedCount === 0) throw `User Topup Value is not updated !!!`
                }).catch(e => { throw `Error while updating topup amount: ${e}` })

            })

            if (userTo.topup == 0) {
                await userDbHandler.updateById(user_id, { topup_at: now() });
            }

            let data = {
                user_id: user_id_to,
                investment_plan_id: investment_plan_id,
                amount: amount,
                amount_r: amount,
                amount_coin: amount_coin,
                bonus: bonus,
                type: plan.type,
                status: 1
            }

            let iData = await investmentDbHandler.create(data);

            // REMOVED CONDITION:
            // if (userTo.status && userTo.topup > 0 && userTo.refer_id) {
            if (userTo.status && userTo.refer_id) {
                try {
                    let sponsorID = await investmentDbHandler.getCount({ status: true }, userTo.refer_id)
                    if (!sponsorID > 0) throw "SponsorID doesn't has active package!"
                    let directPercent = await settingDbHandler.getOneByQuery({ name: "directIncome" })
                    if (!directPercent) throw "No Direct Income Exists !!!"
                    directPercent = parseFloat(directPercent.value)

                    let new_amount = amount * directPercent

                    let directData = {
                        user_id: userTo.refer_id,
                        user_id_from: user_id_to,
                        investment_id: iData._id,
                        investment_plan_id: investment_plan_id,
                        amount: new_amount,
                        wamt: new_amount,
                        iamount: amount,
                        level: 0,
                        type: 0,
                        extra: {
                            planID: plan.type
                        }
                    }

                    await userDbHandler.updateOneByQuery({ _id: ObjectId(userTo.refer_id) },
                        {
                            $inc: { wallet: new_amount, "extra.directIncome": new_amount }
                        }
                    ).then(async response => {
                        if (!response.acknowledged || response.modifiedCount === 0) throw `Direct Income Not Updated !!!`

                        await incomeDbHandler.create(directData);
                    })
                } catch (error) {
                    log.error(`error while creating directIncome: `, error)
                }

            }

            /*
            let top = getTopLevelByRefer(user_id_to, 10);
            let level_amount = [0.1, 0.1, 0.05, 0.02, 0.01, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005];
            let i = 0;
            let level = top.length;
            if(level>15){level=15;}
            if(level>0){
                while(i<level){
                    value = top[i];
                    let j = i;
                    if(i<15){j=i;}else{j=15;}
                    let percentage = level_amount[j];
                    let new_amount = percentage * amount;
                    let _user = await userDbHandler.getById(value);
                    if(_user.topup > 0){
                        if(i==0){
                            let directData = {
                                user_id: value,
                                user_id_from: user_id_to,
                                investment_id: iData._id,
                                investment_plan_id: investment_plan_id,
                                amount: new_amount,
                                wamt: new_amount,
                                iamount: amount,
                                level: 0,
                                type: 0
                            }
                            await userDbHandler.updateById(value, { $inc: { wallet: new_amount } });
                            await incomeDbHandler.create(directData);
                        }
                        else if(_user2.topup > 0){
                            let levelData = {
                                user_id: value,
                                user_id_from: user_id_to,
                                investment_id: iData._id,
                                investment_plan_id: investment_plan_id,
                                amount: new_amount,
                                wamt: new_amount,
                                iamount: amount,
                                level: i,
                                type: 1
                            }
                            await userDbHandler.updateById(value, { $inc: { wallet: new_amount } });
                            await incomeDbHandler.create(levelData);
                        }
                    }
                    i++;
                }
            }
            */

            responseData.msg = "Investment successful!";
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
            let getData = await investmentDbHandler.getCount(reqObj, user_id);
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
            let getData = await investmentDbHandler.getSum(reqObj, user_id);
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