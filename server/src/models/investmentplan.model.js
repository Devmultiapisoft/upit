'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { toJSON, paginate } = require('./plugins');

/**
 * Creating InvestmentPlan Schema Model
 */
const investmentplanSchema = new Schema({
    title: {
        type: String,
        require: true
    },
    amount_from: {
        type: Number,
        default: 0
    },
    amount_to: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    },
    days: {
        type: Number,
        default: 0
    },
    frequency_in_days: {
        type: Number,
        default: 1 // 1, 7, 30. 365
    },
    type: {
        type: Number,
        default: 0 // planID
    },
    status: {
        type: Boolean,
        default: true // active or deactive
    },
    extra: {
        type: Object,
        default: {}
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// add plugin that converts mongoose to json
investmentplanSchema.plugin(toJSON);
investmentplanSchema.plugin(paginate);

module.exports = mongoose.model('InvestmentPlans', investmentplanSchema);