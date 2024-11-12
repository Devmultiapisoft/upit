'use strict';
const logger = require('../../services/logger');
const log = new logger('WithdrawalController').getChildLogger();
const { withdrawalDbHandler, userDbHandler, settingDbHandler } = require('../../services/db');
const responseHelper = require('../../utils/customResponse');
const config = require('../../config/config');
const { userModel } = require('../../models');
const axios = require('axios')

const ethers = require('ethers');

const getExchangeRate = async (amount) => {
    try {

        const response = await axios.post(
            'https://api.coinbrain.com/public/coin-info',
            { "56": ["0xC9F641c5EF43C845897Aaf319e80bceA729d2a1F"] }
        )

        if (response.status !== 200) throw "No Conversion Rate Found!"

        let conversionRate = 1 / response.data[0]?.priceUsd
        return {
            conversionRate,
            netAmount: (conversionRate * amount).toFixed(4)
        }

    } catch (error) {
        throw error
    }
}

const withdrawStatusType = {
    0: "PENDING",
    1: "REJECTED",
    2: "APPROVED"
}

const initiateTxn = async (txn, priv_key) => {
    try {

        let hash = null
        const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed1.binance.org:443');

        const wallet = new ethers.Wallet(priv_key, provider);

        // Create contract instance
        const contractInstance = new ethers.Contract(config.withdrawAddress, config.withdrawABI, wallet);
        const amount = (txn.net_amount * (10 ** 18)).toString()

        // Calculate gas fee
        let gasLimit = await contractInstance.estimateGas["transfer"](txn.address, amount)
        let gasPrice = await provider.getGasPrice()
        gasLimit = gasLimit.mul(110).div(100)
        gasPrice = gasPrice.mul(2)

        // Check wallet balance for gas fee
        const balance = await wallet.getBalance();
        if (balance.lt(gasPrice)) {
            throw 'Insufficient balance for gas fee'
        }

        try {

            hash = (await contractInstance.transfer(txn.address, amount, { gasLimit, gasPrice })).hash

        } catch (error) {
            console.error('Error:', error)
            hash = error.transaction.hash
        }

        // make the status approved/pending/rejected accordingly
        if (hash) {
            txn.txid = hash
            txn.status = 2
        } else {
            txn.status = 0
        }
        txn.remark = withdrawStatusType[txn.status]
        await txn.save()

    } catch (error) {
        throw error
    }
}

module.exports = {

    getAll: async (req, res) => {
        let reqObj = req.query;
        let user = req.user;
        let user_id = user.sub;
        log.info('Recieved request for getAll:', reqObj);
        let responseData = {};
        try {
            let getList = await withdrawalDbHandler.getAll(reqObj, user_id);
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
            let getData = await withdrawalDbHandler.getById(id);
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
            let user = await userDbHandler.getById(user_id);

            // check if the user has gas wallet limit atelast 2
            const gasAmountToBeDeducted = 2
            if (user.extra.gas_wallet < gasAmountToBeDeducted) {
                responseData.msg = `You should have equal or more gas limit than ${gasAmountToBeDeducted} in your gas wallet to proceed with the withdrawal!`
                return responseHelper.error(res, responseData)
            }

            let privKey = await settingDbHandler.getOneByQuery({ name: "Keys" }, { value: 1 })
            if (!privKey?.value) throw "Invalid Private key!"

            let withdrawSettings = await settingDbHandler.getOneByQuery({ name: "withdrawConditions" })
            if (!withdrawSettings) throw "No Withdrawal Settings exists!"
            // let min = 10;
            let min = withdrawSettings?.extra?.minWithdrawal;
            let max = 1000000;
            let amount = parseFloat(reqObj.amount);
            let fee = amount * (withdrawSettings?.extra?.withdrawalFeeInPercent || 0);
            let net_amount = amount - fee;
            let rate = 1;
            let amount_coin = net_amount * rate;
            let currency = config?.tokenSymbol;
            let currency_coin = config?.tokenSymbol;
            let address = reqObj?.address ? reqObj?.address : user.address;
            let walletType = reqObj?.walletType
            let wallet = user.wallet;

            // if (!address) {
            //     responseData.msg = `Please complete your profile!`;
            //     return responseHelper.error(res, responseData);
            // }

            // if (user.topup <= 0) {
            //     responseData.msg = `Please topup your account!`;
            //     return responseHelper.error(res, responseData);
            // }

            switch (walletType) {
                case 'tasksIncome':
                    if (user?.extra?.tasksIncome < amount) {
                        responseData.msg = `Insufficient Fund!`;
                        return responseHelper.error(res, responseData);
                    }
                    break;
                case 'levelIncome':
                    if (user?.extra?.levelIncome < amount) {
                        responseData.msg = `Insufficient Fund!`;
                        return responseHelper.error(res, responseData);
                    }
                    break;
                default:
                    responseData.msg = `Kindly select a wallet!`;
                    return responseHelper.error(res, responseData);
            }

            // if (wallet < amount) {
            //     responseData.msg = `Insufficient fund!`;
            //     return responseHelper.error(res, responseData);
            // }

            if (amount < min) {
                responseData.msg = `Minimum withdrawal ${min}!`;
                return responseHelper.error(res, responseData);
            }
            if (amount > max) {
                responseData.msg = `Miximum withdrawal ${max}!`;
                return responseHelper.error(res, responseData);
            }
            if (amount % min) {
                responseData.msg = `Request multiple of ${min}!`;
                return responseHelper.error(res, responseData);
            }

            const { conversionRate, netAmount } = await getExchangeRate(amount).catch(e => { throw e })

            let data = {
                user_id: user_id,
                amount: amount,
                fee: fee,
                net_amount: netAmount,
                amount_coin: amount_coin,
                rate: conversionRate,
                address: address,
                currency: currency,
                currency_coin: currency_coin,
                extra: {
                    walletType,
                    gasAmountToBeDeducted
                }
            }

            // will not work
            // await userDbHandler.updateById({ _id: user_id }, { $inc: { wallet: -amount } });

            await userModel.updateOne(
                { _id: user_id },
                {
                    $inc: {
                        [`extra.${walletType}`]: -amount,
                        [`extra.${walletType}_withdraw`]: amount,
                        [`extra.gas_wallet`]: -gasAmountToBeDeducted
                    }
                }
            ).then(async val => {

                if (!val.modifiedCount > 0) throw "Unable to update amount !"

                await withdrawalDbHandler.create(data)
                    .then(async (val) => {

                        // initiate the transaction
                        initiateTxn(val, privKey.value)

                    }).catch(e => { throw `Something went wrong while creating withdrawal report: ${e}` })

            }).catch(e => { throw e })

            responseData.msg = "Amount has been withdrawed successfully!";
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
            let getData = await withdrawalDbHandler.getCount(reqObj, user_id);
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
            let getData = await withdrawalDbHandler.getSum(reqObj, user_id);
            responseData.msg = "Data fetched successfully!";
            responseData.data = getData;
            return responseHelper.success(res, responseData);
        } catch (error) {
            log.error('failed to fetch data with error::', error);
            responseData.msg = 'Failed to fetch data';
            return responseHelper.error(res, responseData);
        }
    },
};