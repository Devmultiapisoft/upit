'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { toJSON, paginate } = require('./plugins');

/**
 * Creating Income Schema Model
 */
const incomeSchema = new Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Users'
    },
    user_id_from: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'Users',
        default: null
    },
    investment_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'Investments',
        default: null
    },
    investment_plan_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'InvestmentPlans',
        default: null
    },
    amount: {
        type: Number,
        default: 0
    },
    wamt: {
        type: Number,
        default: 0
    },
    uamt: {
        type: Number,
        default: 0
    },
    camt: {
        type: Number,
        default: 0
    },
    iamount: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 0
    },
    pool: {
        type: Number,
        default: 0
    },
    days: {
        type: Number,
        default: 0
    },
    type: {
        type: Number,
        default: 0
    },
    extra: {
        type: Object,
        default: {}
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// add plugin that converts mongoose to json
incomeSchema.plugin(toJSON);
incomeSchema.plugin(paginate);

module.exports = mongoose.model('Incomes', incomeSchema);