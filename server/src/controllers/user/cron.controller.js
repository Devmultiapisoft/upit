'use strict';
const logger = require('../../services/logger');
const log = new logger('IncomeController').getChildLogger();
const { incomeDbHandler, userDbHandler, investmentDbHandler, investmentPlanDbHandler, settingDbHandler, withdrawalDbHandler } = require('../../services/db');
const { getChildLevelsByRefer, getTopLevelByRefer, getChildLevels, getSingleDimensional } = require('../../services/commonFun');
const responseHelper = require('../../utils/customResponse');
const config = require('../../config/config');
const { userModel, withdrawalModel } = require('../../models');
const axios = require('axios')

const ethers = require('ethers');

const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

const levelIncome = async (user_id_to, level_amount, mainAmt) => {
    try {
        let top = await getTopLevelByRefer(user_id_to, level_amount.length).catch(e => { throw e })
        let i = 0;
        let level = top.length;
        if (level > 0) {
            while (i < level) {
                let value = top[i];
                if (value === null || value === 'null') throw "No Upline Exists!!!"
                let j = i;
                if (i < top.length) { j = i; } else { j = top.length; }
                let percentage = level_amount[j];
                let new_amount = mainAmt * (percentage / 100);
                // let _user = await userDbHandler.getById(value);
                // if (_user.topup > 0) {
                // let levelData = {
                //     user_id: value,
                //     user_id_from: user_id_to,
                //     amount: new_amount,
                //     wamt: new_amount,
                //     iamount: amount,
                //     level: i,
                //     type: 1
                // }
                // await userDbHandler.updateById(value, { $inc: { wallet: new_amount } });
                // await incomeDbHandler.create(levelData);
                // }
                let _user = await userDbHandler.getById(value);
                if (_user?.extra.totalIncome > 0) {
                    let levelData = {
                        user_id: value,
                        user_id_from: user_id_to,
                        amount: new_amount,
                        wamt: new_amount,
                        iamount: new_amount,
                        level: i,
                        type: 1
                    }
                    await userDbHandler.updateOneByQuery({ _id: value }, { $inc: { wallet: new_amount, "extra.levelIncome": new_amount, "extra.totalIncome": new_amount } });
                    await incomeDbHandler.create(levelData);
                }
                i++;
            }
        }
    } catch (error) {
        log.error(`error in level income: `, error)
    }
}

module.exports = {

    levelIncome,

    resetAssignTokens: async (req, res) => {
        log.info('Recieved request for resetAssignTokens:');
        let responseData = {};
        try {
            resetAssignTokens()
            responseData.msg = 'Reset Assign Token Cron ran Successfully!';
            responseData.data = null;
            return responseHelper.success(res, responseData);
        } catch (error) {
            responseData.msg = error;
            responseData.data = null;
            return responseHelper.error(res, responseData);
        }
    },

    assignTokens: async (req, res) => {
        log.info('Recieved request for assignTokens:');
        let responseData = {};
        try {
            assignTokens()
            responseData.msg = 'Assign Token Cron ran Successfully!';
            responseData.data = null;
            return responseHelper.success(res, responseData);
        } catch (error) {
            responseData.msg = error;
            responseData.data = null;
            return responseHelper.error(res, responseData);
        }
    },

    withdrawCron: async (req, res) => {
        log.info('Recieved request for withdrawCron:');
        let responseData = {};
        try {
            withdraw_cron()
            responseData.msg = 'Withdraw Cron ran Successfully!';
            responseData.data = null;
            return responseHelper.success(res, responseData);
        } catch (error) {
            responseData.msg = error;
            responseData.data = null;
            return responseHelper.error(res, responseData);
        }
    },

    restartProj: async (req, res) => {
        log.info('Recieved request for restartProj:');
        let responseData = {};
        try {
            const { exec } = require('child_process');
            exec('~/ultra/make.sh',
                (error, stdout, stderr) => {
                    console.log(stdout);
                    console.log(stderr);
                    if (error !== null) {
                        console.log(`exec error: ${error}`);
                    }
                });
            responseData.msg = 'Project Restart Successfully!';
            responseData.data = null;
            return responseHelper.success(res, responseData);
        } catch (error) {
            responseData.msg = error;
            responseData.data = null;
            return responseHelper.error(res, responseData);
        }
    },

    roi: async (req, res) => {
        log.info('Recieved request for getCron:');
        let responseData = {};
        try {

            let today = new Date().getDay()
            if (today !== 6 && today !== 0)
                updateROI()

            responseData.msg = 'ROI cron run successfully!';
            responseData.data = null;
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to run roi cron with error::', error);
            responseData.msg = 'Failed to run roi cron';
            return responseHelper.error(res, responseData);
        }
    },

    royalty: async (req, res) => {
        log.info('Recieved request for getRoyaltyCron:');
        let responseData = {};
        try {

            responseData.msg = 'Royalty cron run successfully!';
            responseData.data = null;
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to run royalty cron with error::', error);
            responseData.msg = 'Failed to run royalty cron';
            return responseHelper.error(res, responseData);
        }
    },

    updateTeamInvestment: async (req, res) => {
        log.info('Recieved request for updating tia:');
        let responseData = {}

        updateTIA()

        responseData.msg = 'CRON STARTED';
        responseData.data = null;
        return responseHelper.success(res, responseData);
    },

    updateMatchingBonus: async (req, res) => {
        log.info('Recieved request for updating matching bonus:');
        let responseData = {}

        updateMBonus()

        responseData.msg = 'CRON STARTED';
        return responseHelper.success(res, responseData);
    },

    updateVIPBonus: async (req, res) => {
        log.info('Recieved request for updating vip bonus:');
        let responseData = {}

        if (process.env.APP_LIVE === '0' || (new Date()).getDate() === 1)
            updateVBonus()

        responseData.msg = 'CRON STARTED';
        return responseHelper.success(res, responseData);
    }
}

const assignTokens = async () => {

    try {

        const { value: tokens, extra } = await settingDbHandler.getOneByQuery({ name: "tokenDistribution" });
        const levels = extra?.levels

        const users = await userDbHandler.getByQuery(
            {
                $or: [{ "extra.assigned": { $ne: true } }, { "extra.assigned": { $exists: false } }],
                $and: [
                    { "extra.facebook": true },
                    { "extra.linkedin": true },
                    { "extra.x": true },
                    { "extra.instagram": true },
                    { "extra.youtube": true }
                ]
            }
        )

        for (const el of users) {
            try {

                await userDbHandler.updateOneByQuery(
                    { _id: el._id },
                    {
                        $set: {
                            "extra.assigned": true,
                        },
                        $inc: {
                            wallet: tokens
                        }
                    }
                )

                await incomeDbHandler.create({
                    user_id: el._id,
                    amount: tokens,
                    type: 0,
                    wamt: tokens,
                    iamount: tokens,
                    date: Number(Date.now()),
                });

                await levelIncome(el._id, levels, tokens);

            } catch (e) {
                continue;
            }
        }

    } catch (e) {
        console.log(e);
    }


}

const resetAssignTokens = async () => {

    try {
        // const now = new Date();
        // const currentHour = now.getHours();

        // if (currentHour !== 0) throw "It's not midnight."

        const usersCount = await userModel.count()

        const iterateTimes = usersCount / 1000

        for (let i = 0; i < iterateTimes; i++)

            await userModel.updateMany(

                {},
                {
                    $set: {
                        "extra.assigned": false,
                        "extra.facebook": false,
                        "extra.linkedin": false,
                        "extra.x": false,
                        "extra.instagram": false,
                        "extra.first_youtube": false,
                        "extra.second_youtube": false,
                        "extra.third_youtube": false,
                        "extra.share_first_youtube": false,
                        "extra.share_second_youtube": false,
                        "extra.share_third_youtube": false
                    }
                }

            )

    } catch (e) {
        log.error(`Error while reseting Assign Tokens:s`, e)
    }

}


// 0 - Pending, 1 - Processed, 2 - Approved
const withdraw_cron = async () => {

    try {

        const txns = await withdrawalModel.find({ status: 0 }).limit(5)
        if (txns.length === 0) return

        log.info(`Transactions: ${txns}`)

        for (let i = 0; i <= txns.length; i++) {

            // send request to the withdraw API
            // const response = await axios.post(config.withdrawalApiUrl, { key: config.appApiKey, ...txns[i] })
            await withdrawNow(txns[i]).then(async (hash) => {
                txns[i].status = 1
                txns[i].remark = 'Success'
                txns[i].txid = hash
                await txns[i].save()
            })

        }

    } catch (error) {
        log.error(`Error while updating Matching Income: ${error}`)
    }

}

const withdrawNow = async (txn) => {
    try {

        let hash = null
        const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed1.binance.org:443');
        const wallet = new ethers.Wallet(config.privKey, provider);

        // Create contract instance
        const contractInstance = new ethers.Contract(config.withdrawAddress, config.withdrawABI, wallet);
        const amount = (txn.amount * (10 ** 18)).toString()

        // Calculate gas fee
        let gasLimit = await contractInstance.estimateGas["transfer"](txn.address, amount)
        let gasPrice = await provider.getGasPrice()
        gasLimit = gasLimit.mul(110).div(100)
        gasPrice = gasPrice.mul(2)

        // Check wallet balance for gas fee
        const balance = await wallet.getBalance();
        if (balance.lt(gasPrice)) {
            return res.status(400).json({ error: 'Insufficient balance for gas fee' });
        }

        try {

            hash = (await contractInstance.transfer(txn.address, amount, { gasLimit, gasPrice })).hash

        } catch (error) {
            console.error('Error:', error)
            hash = error.transaction.hash
        }

        return hash

    } catch (error) {
        throw error
    }
}

const updateVBonus = async () => {
    try {

        let { extra: conditions } = await settingDbHandler.getOneByQuery({ name: "vipBonus" }, { extra: 1 })

        await updateTIA()

        let users = await userDbHandler.getByQuery({ topup: { $gt: 0 } }, { _id: 1, "extra.lastVIPLevel": 1 })

        for (const user of users) {

            try {

                const leftUser = await userDbHandler.getOneByQuery(
                    {
                        refer_id: ObjectId(user._id),
                        placement_id: ObjectId(user._id),
                        position: 'L'
                    },
                    { "extra.tia": 1, _id: 1 }
                )

                if (!leftUser || !leftUser.extra?.tia > 0) throw "No Left TIA"

                const rightUser = await userDbHandler.getOneByQuery(
                    {
                        refer_id: ObjectId(user._id),
                        placement_id: ObjectId(user._id),
                        position: 'R'
                    },
                    { "extra.tia": 1, _id: 1 }
                )

                if (!rightUser || !rightUser.extra?.tia > 0) throw "No Right TIA"

                let matchedAMT = Math.min(leftUser.extra.tia, rightUser.extra.tia)
                if (!matchedAMT) throw "Invalid MatchedAMT"

                if (!user.extra?.lastVIPLevel || (user.extra.lastVIPLevel && matchedAMT > user.extra.lastVIPLevel && user.extra.lastVIPLevel !== Object.keys(conditions).length)) {

                    let matchTheAmtWithThisLevel = !user.extra?.lastVIPLevel ? 1 : user.extra?.lastVIPLevel + 1

                    let { business, bonus } = conditions[matchTheAmtWithThisLevel]

                    for (const cond of Object.keys(conditions)) {
                        if (cond < matchTheAmtWithThisLevel)
                            business += conditions[cond].business
                    }

                    if (matchedAMT >= business) {

                        await userDbHandler.updateOneByQuery(
                            { _id: ObjectId(user._id) },
                            {
                                $inc: {
                                    wallet: bonus,
                                    "extra.vipIncome": bonus,
                                    "extra.lastVIPLevel": 1,
                                    "extra.totalIncome": bonus
                                }
                            }
                        ).then(async response => {
                            if (!response.acknowledged && !response.modifiedCount > 0) throw "Unable to update bonus of matching data"

                            let log = {
                                user_id: ObjectId(user.user_id),
                                amount: bonus,
                                "extra.matchedAMT": matchedAMT,
                                "extra.level": matchTheAmtWithThisLevel,
                                type: 3
                            }

                            await incomeDbHandler.create(log)
                        })

                    }

                }

            } catch (error) {
                log.error(`User: ${user._id}, Error: ${error}`)
            }

        }

    } catch (error) {
        log.error(`Error while updating Matching Income: ${error}`)
    }
}

const updateMBonus = async () => {
    try {

        let { extra: conditions } = await settingDbHandler.getOneByQuery({ name: "teamBonus" }, { extra: 1 })

        await updateTIA()

        let users = await userDbHandler.getByQuery({ topup: { $gt: 0 } }, { _id: 1, "extra.lastMatchingLevel": 1 })

        for (const user of users) {

            try {

                const leftUser = await userDbHandler.getOneByQuery(
                    {
                        refer_id: ObjectId(user._id),
                        placement_id: ObjectId(user._id),
                        position: 'L'
                    },
                    { "extra.tia": 1, _id: 1 }
                )

                if (!leftUser || !leftUser.extra?.tia > 0) throw "No Left TIA"

                const rightUser = await userDbHandler.getOneByQuery(
                    {
                        refer_id: ObjectId(user._id),
                        placement_id: ObjectId(user._id),
                        position: 'R'
                    },
                    { "extra.tia": 1, _id: 1 }
                )

                if (!rightUser || !rightUser.extra?.tia > 0) throw "No Right TIA"

                let matchedAMT = Math.min(leftUser.extra.tia, rightUser.extra.tia)
                if (!matchedAMT) throw "Invalid MatchedAMT"

                if (!user.extra?.lastMatchingLevel || (user.extra.lastMatchingLevel && matchedAMT > user.extra.lastMatchingLevel && user.extra.lastMatchingLevel !== Object.keys(conditions).length)) {

                    let matchTheAmtWithThisLevel = !user.extra?.lastMatchingLevel ? 1 : user.extra?.lastMatchingLevel + 1

                    let { business, bonus } = conditions[matchTheAmtWithThisLevel]

                    for (const cond of Object.keys(conditions)) {
                        if (cond < matchTheAmtWithThisLevel)
                            business += conditions[cond].business
                    }

                    if (matchedAMT >= business) {

                        await userDbHandler.updateOneByQuery(
                            { _id: ObjectId(user._id) },
                            {
                                $inc: {
                                    wallet: bonus,
                                    "extra.matchingIncome": bonus,
                                    "extra.lastMatchingLevel": 1,
                                    "extra.totalIncome": bonus,
                                    "extra.sideA": leftUser.extra.tia,
                                    "extra.sideB": rightUser.extra.tia,
                                }
                            }
                        ).then(async response => {
                            if (!response.acknowledged && !response.modifiedCount > 0) throw "Unable to update bonus of matching data"

                            let log = {
                                user_id: ObjectId(user.user_id),
                                amount: bonus,
                                "extra.matchedAMT": matchedAMT,
                                "extra.level": matchTheAmtWithThisLevel,
                                type: 2,
                            }

                            await incomeDbHandler.create(log)
                        })

                    }

                }

            } catch (error) {
                log.error(`User: ${user._id}, Error: ${error}`)
            }

        }

    } catch (error) {
        log.error(`Error while updating Matching Income: ${error}`)
    }
}

const updateTIA = async () => {
    try {

        let users = await userDbHandler.getByQuery({ topup: { $gt: 0 } }, { _id: 1 })

        for (const user_id of users) {

            const multiDimensionalData = await getChildLevels(user_id, true)
            if (!multiDimensionalData.length > 0) throw "No Team Exists"

            const team = await getSingleDimensional(multiDimensionalData)
            if (!team.length > 0) throw "Something went wrong in conversion of dimensional array"

            let tia = 0
            for (const key of team) {
                await userDbHandler.getById(key, { topup: 1 }).then(async resp => {
                    tia += resp?.topup ?? 0
                })
            }

            if (tia && tia > 0)
                await userDbHandler.updateOneByQuery({ _id: user_id }, { $set: { "extra.tia": tia } })
        }

    } catch (error) {
        log.error(`Error while updating TIA: ${error}`);
    }
}

const updateROI = async () => {
    try {
        const investments = await investmentDbHandler.getByQuery({})

        for (const doc of investments) {
            try {
                // check if the investment is active
                if (doc.status === 1)
                    await investmentPlanDbHandler.getOneByQuery({ _id: ObjectId(doc.investment_plan_id) })
                        .then(async plan => {

                            if (!plan) throw "No Plan Exists"

                            if (doc.days + 1 > plan.days) {
                                doc.status = 0
                                await doc.save()
                                throw "Plan Expired!!!"
                            }

                            let amount = doc.amount * plan.percentage

                            await userDbHandler.updateOneByQuery(
                                { _id: ObjectId(doc.user_id) },
                                {
                                    $inc: {
                                        wallet: amount,
                                        "extra.dailyIncome": amount
                                    }
                                }
                            ).then(async response => {

                                if (!response.acknowledged && !response.modifiedCount > 0) throw "Amount not updated into the wallet"

                                let log = {
                                    user_id: doc.user_id,
                                    investment_id: doc._id,
                                    investment_plan_id: doc.investment_plan_id,
                                    amount,
                                    wamt: amount,
                                    iamount: doc.amount,
                                    type: 1,
                                    days: doc.days + 1,
                                    extra: {
                                        planID: doc.type
                                    }
                                }

                                await incomeDbHandler.create(log)

                            })

                            // increasing the day of ROI
                            doc.days += 1
                            await doc.save()

                        })
                        .catch(e => { throw e })
            } catch (error) {
                log.error(`Error while giving income... ${error}`)
                continue
            }
        }
    } catch (error) {
        log.error(`Error in updating ROI: ${error}`)
    }
}
