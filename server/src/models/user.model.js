'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const { toJSON, paginate } = require('./plugins');

/**
 * Creating User Schema Model
 */
const userSchema = new Schema({
    refer_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'Users',
        default: null
    },
    placement_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'Users',
        default: null
    },
    position: {
        type: String,
        default: '',
        enum: ['', 'L', 'R']
    },
    username: {
        type: String,
        default: '',
        trim: true,
    },
    password: {
        type: String,
        default: '',
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    name: {
        type: String,
        trim: true,
    },
    device_token: {
        type: String,
        default: ''
    },
    device_type: {
        type: String,
        default: '1',
        enum: ['1', '2']
    },
    access_token: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        trim: true,
    },
    email_verified: {
        type: Boolean,
        default: false,
    },
    phone_number: {
        type: String,
        trim: true,
    },
    phone_verified: {
        type: Boolean,
        default: false,
    },
    reward: {
        type: Number,
        default: 0,
    },
    wallet: {
        type: Number,
        default: 0,
    },
    wallet_topup: {
        type: Number,
        default: 0,
    },
    topup: {
        type: Number,
        default: 0,
    },
    topup_at: {
        type: Date
    },
    bank_details: {
        type: Object
    },
    location: {
        type: Object
    },
    avatar: {
        type: String,
        default: '',
    },
    force_relogin_time: {
        type: String,
        default: null,
    },
    force_relogin_type: {
        type: String,
        enum: ['session_expired', 'permission_change', 'account_deactive'],
        default: 'session_expired',
    },
    two_fa_enabled: {
        type: Boolean,
        default: false,
    },
    two_fa_secret: {
        type: String,
        default: "",
    },
    status: {
        type: Boolean,
        default: true
    },
    is_default: {
        type: Boolean,
        default: false // make it true for top ID
    },
    extra: {
        type: Object,
        default: {}
    },
    dob: {
        type: String,
        trim: true
    },
    state: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    wallet_address: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        trim: true
    },
    country_code: {
        type: String,
        trim: true
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

/**
 * Method to Encrypt User password before Saving to Database
 */
userSchema.pre('save', function (next) {
    let user = this;
    let salt = config.bcrypt.saltValue;
    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) {
        return next();
    }
    // generate a salt
    bcrypt.genSalt(salt, function (err, salt) {
        if (err) return next(err);
        // hash the password with new salt
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) return next(err);
            // override the plain password with the hashed one
            user.password = hash;
            next();
        });
    });
});
userSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('Users', userSchema);