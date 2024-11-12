'use strict';
const { incomeModel } = require('../../models');
const { ObjectId } = require('mongodb');
const { pick, search, advancseSearch, dateSearch, statusSearch } = require('../../utils/pick');
let instance;
/*********************************************
 * METHODS FOR HANDLING INCOME MODEL QUERIES
 *********************************************/
class Income {
	constructor() {
		//if income instance already exists then return
		if (instance) {
			return instance;
		}
		this.instance = this;
		this._model = incomeModel;
	}
	create(data) {
		let model = new this._model(data);
		return model.save(data);
	}
	async getAll(data, user_id = null) {
		let params = {};
		if (user_id) {
			params.user_id = ObjectId(user_id);
		}
		if (data.type !== undefined) {
			params.type = parseInt(data.type);
		}

		if (data.search) {
			params = {
				$and: [
					{ ...statusSearch(data, ['status']), ...params },
					search(data.search, [])
				]
			};
		}
		else {
			params = {
				...advancseSearch(data, ['amount', 'wamt', 'uamt', 'camt', 'iamount', 'level', 'pool', 'days']),
				...dateSearch(data, 'created_at'),
				...statusSearch(data, ['status']),
				...params
			};
		}

		let filter = params;
		const options = pick(data, ['sort_by', 'limit', 'page']);
		options.sort_fields = ['amount', 'wamt', 'uamt', 'camt', 'iamount', 'level', 'pool', 'days', 'created_at'];
		options.populate = '';
		if (!user_id) {
			const pipeline = [];
			pipeline.push(
				{
					$addFields: {
						user_id: {
							$convert: {
								input: "$user_id",
								to: "objectId",
								onError: 0,
								onNull: 0
							}
						}
					}
				},
				{
					$lookup: {
						from: "users",
						localField: "user_id",
						foreignField: "_id",
						as: "user"
					}
				},
				{ $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }
			);

			pipeline.push(
				{
					$addFields: {
						user_id_from: {
							$convert: {
								input: "$user_id_from",
								to: "objectId",
								onError: 0,
								onNull: 0
							}
						}
					}
				},
				{
					$lookup: {
						from: "users",
						localField: "user_id_from",
						foreignField: "_id",
						as: "user_from"
					}
				},
				{ $unwind: { path: "$user_from", preserveNullAndEmptyArrays: true } }
			);

			pipeline.push({
				$project: {
					user_id: 1,
					user_id_from: 1,
					investment_id: 1,
					investment_plan_id: 1,
					username: {
						$ifNull: ["$user.username", ""]
					},
					user: {
						$ifNull: ["$user.name", ""]
					},
					username_from: {
						$ifNull: ["$user_from.username", ""]
					},
					user_from: {
						$ifNull: ["$user_from.name", ""]
					},
					amount: 1,
					wamt: 1,
					uamt: 1,
					camt: 1,
					iamount: 1,
					level: 1,
					pool: 1,
					days: 1,
					type: 1,
					extra: 1,
					created_at: 1
				},
			});
			options.pipeline = pipeline;
		}

		const results = await incomeModel.paginate(filter, options);
		return results;
	}
	getCount(data, user_id = null) {
		let params = { };
		if (user_id) {
			params.user_id = user_id;
		}
        if (data.status !== undefined) {
            params.status = data.status ? true : false;
        }
        if (data.type !== undefined) {
            params.type = data.type ? data.type : 0;
        }
		return this._model.countDocuments(params).exec();
	}
	async getSum(data, user_id = null) {
		let params = { type: type };
		if (user_id) {
			params.user_id = ObjectId(user_id);
		}
        if (data.status !== undefined) {
            params.status = data.status ? true : false;
        }
        if (data.type !== undefined) {
            params.type = data.type ? data.type : 0;
        }

		let pipeline = [];
		pipeline.push({ $match: params });
		pipeline.push({
			_id: 1,
			amount: 1
		});
		pipeline.push({
			$group: {
				_id: null,
				amount: { $sum: "$amount" },
				count: { $sum: 1 }
			}
		});
		return await incomeModel.aggregate(pipeline).exec();
	}
	getById(id, projection = {}) {
		return this._model.findOne({ _id: id }, projection);
	}
	getOneByQuery(query, projection = {}) {
		return this._model.findOne(query, projection);
	}
	getByQuery(query, projection = {}) {
		return this._model.find(query, projection);
	}
	updateById(id, data, option = {}) {
		option = { ...{ new: true }, ...option }
		return this._model.findByIdAndUpdate(id, { $set: data }, option);
	}
	updateByQuery(query, data, option = {}) {
		option = { ...{ new: true }, ...option }
		return this._model.updateMany(query, { $set: data }, option);
	}
	deleteById(id) {
		return this._model.findByIdAndRemove(id);
	}
	getByQueryToArray(query, projection = {}) {
        return this._model.find(query, projection).lean()
    }
}
module.exports = new Income();
