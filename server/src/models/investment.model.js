'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { toJSON, paginate } = require('./plugins');

/**
 * Creating Investment Schema Model
 */
const investmentSchema = new Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Users'
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
    amount_r: {
        type: Number,
        default: 0
    },
    amount_coin: {
        type: Number,
        default: 0
    },
    bonus: {
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
    status: {
        type: Number,
        enum: [0, 1],
        default: 0
    },
    release_at: {
        type: Date
    },
    extra: {
        type: Object,
        default: {}
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// add plugin that converts mongoose to json
investmentSchema.plugin(toJSON);
investmentSchema.plugin(paginate);

module.exports = mongoose.model('Investments', investmentSchema);