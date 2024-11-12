'use strict';
const { userDbHandler, userreDbHandler } = require('../db');
const { userreModel } = require('../../models');

const getTopLevelByRefer = async (user_id, level = 0, arr = []) => {
        try {
            const defaultUser = await userDbHandler.getOneByQuery({ is_default: true }, { _id: 1 });
            if (arr.length === level && level !== 0) {
                return arr;
            } else if (user_id === defaultUser._id) {
                return arr;
            } else {
                const user = await userDbHandler.getOneByQuery({ _id: user_id }, { refer_id: 1 });
                if (user) {
                    arr.push(user.refer_id);
                    return getTopLevelByRefer(user.refer_id, level, arr);
                } else {
                    return arr;
                }
            }
        } catch (error) {
            throw error;
        }
}

module.exports = {

    getTopLevelByRefer,

    getSingleDimensional: (twoDimensional) => {
        const singleDimensionalArray = [];
        twoDimensional.forEach(singleDimensional => {
            singleDimensional.forEach(value => {
                singleDimensionalArray.push(value);
            });
        });

        return singleDimensionalArray;
    },

    getChildLevels: async (user_id, withInitial = false, levelLimit = 0) => {
        if (user_id === null) {
            const defaultUser = await userDbHandler.getOneByQuery({ is_default: true }, { _id: 1 });
            user_id = defaultUser._id;
        }
        let levels = withInitial ? [[user_id]] : [[]];

        let i = 1;
        while (true) {
            const currentLevel = (i == 1) ? [user_id] : levels[i - 1];
            const children = await userDbHandler.getByQuery({ placement_id: { $in: currentLevel } }, { _id: 1 });

            if (!children.length) break;

            const childIds = children.map(child => child._id);
            levels[i] = childIds;

            if (levelLimit && i === levelLimit) break;

            i++;
        }

        return levels;
    },

    getChildLevelsByRefer: async (user_id, withInitial = false, levelLimit = 0) => {
        if (user_id === null) {
            const defaultUser = await userDbHandler.getOneByQuery({ is_default: true }, { _id: 1 });
            user_id = defaultUser._id;
        }
        let levels = withInitial ? [[]] : [[]];

        let i = 1;
        while (true) {
            const currentLevel = (i == 1) ? [user_id] : levels[i - 1];
            const children = await userDbHandler.getByQuery({ refer_id: { $in: currentLevel } }, { password: 0 });

            if (!children.length) break;
            
            // const childIds = children.map(child => child._id);
            // console.log(children, childIds)
            levels[i] = children;

            if (levelLimit && i === levelLimit) break;

            i++;
        }

        return levels;
    },

    getTopLevel: async (user_id, level = 0, arr = []) => {
        try {
            const defaultUser = await userDbHandler.getOneByQuery({ is_default: true }, { _id: 1 });
            if (arr.length === level && level !== 0) {
                return arr;
            } else if (user_id === defaultUser._id) {
                return arr;
            } else {
                const user = await userDbHandler.getOneByQuery({ _id: user_id }, { placement_id: 1 });
                if (user) {
                    arr.push(user.placement_id);
                    return getTopLevel(user.placement_id, level, arr);
                } else {
                    return arr;
                }
            }
        } catch (error) {
            throw error;
        }
    },

    

    // returns the vacancy in binary registration
    getTerminalId: async (referId, position) => {
        if (referId === null) {
            const defaultUser = await userDbHandler.getOneByQuery({ is_default: true }, { _id: 1 });
            referId = defaultUser._id;
        }
        let terminalId = referId;
        while (true) {
            const user = await userDbHandler.getOneByQuery({ placement_id: terminalId, position: position }, { _id: 1 });
            if (!user) break;
            terminalId = user._id;
        }
        return terminalId;
    },

    getPlacementId: async (referId, unum = 2) => {
        try {
            if (referId === null) {
                const defaultUser = await userDbHandler.getOneByQuery({ is_default: true }, { _id: 1 });
                referId = defaultUser._id;
            }
            let placementId = referId;
            const level = [];
            const results = await userDbHandler.getOneByQuery({ placement_id: placementId }, { _id: 1 });
            if (results.length >= unum) {
                level.push(results.map(result => result._id));
                let i = 0;
                while (true) {
                    let found = false;
                    for (const result of level[i]) {
                        level[i + 1] = [];
                        const nestedResults = await userDbHandler.getOneByQuery({ placement_id: result._id }, { _id: 1 });
                        if (nestedResults.length >= unum) {
                            level[i + 1] = [...level[i + 1], ...nestedResults.map(nestedResult => nestedResult._id)];
                        } else {
                            placementId = result._id;
                            found = true;
                        }
                    }

                    if (!found && level[level.length - 1].length > 0) {
                        i++;
                        continue;
                    }
                    else {
                        break;
                    }
                }
            }
            return placementId;
        } catch (error) {
            throw error;
        }
    },

    getPlacementIdByRefer: async (referId, unum = 2) => {
        try {
            if (referId === null) {
                const defaultUser = await userDbHandler.getOneByQuery({ is_default: true }, { _id: 1 });
                referId = defaultUser._id;
            }
            let placementId = referId;
            const level = [];
            const results = await userDbHandler.getOneByQuery({ refer_id: placementId }, { _id: 1 });
            if (results.length >= unum) {
                level.push(results.map(result => result._id));
                let i = 0;
                while (true) {
                    let found = false;
                    for (const result of level[i]) {
                        level[i + 1] = [];
                        const nestedResults = await userDbHandler.getOneByQuery({ refer_id: result._id }, { _id: 1 });
                        if (nestedResults.length >= unum) {
                            level[i + 1] = [...level[i + 1], ...nestedResults.map(nestedResult => nestedResult._id)];
                        } else {
                            placementId = result._id;
                            found = true;
                        }
                    }

                    if (!found && level[level.length - 1].length > 0) {
                        i++;
                        continue;
                    }
                    else {
                        break;
                    }
                }
            }
            return placementId;
        } catch (error) {
            throw error;
        }
    },

    // get left and right child LEVELS of any user_id
    getChildLevelsPosition: async (user_id, position, l = 0) => {
        if (user_id === null) {
            const defaultUser = await userDbHandler.getOneByQuery({ is_default: true }, { _id: 1 });
            user_id = defaultUser._id;
        }
        const level = [];
        try {
            let result = await userDbHandler.getOneByQuery({ placement_id: user_id, position: position }, { _id: 1 });
            if (result.length !== 0) {
                let i = 1;
                level[i] = result.map(row => row._id);
                while (true) {
                    let nextLevel = [];
                    for (const value of level[i]) {
                        result = await userDbHandler.getOneByQuery({ placement_id: value }, { _id: 1 });
                        result.forEach(row => nextLevel.push(row._id));
                    }
                    if (l && i === l) {
                        break;
                    }
                    if (nextLevel.length !== 0) {
                        level[i + 1] = nextLevel;
                        i++;
                    } else {
                        break;
                    }
                }
            }
            return level;
        } catch (error) {
            throw error;
        }
    },

    getUserType: () => {
        return ['Normal', 'Franchise'];
    },

    getReward: () => {
        return ['No Reward', 'Pearl', 'Ruby', 'Emerald', 'Topaz', 'Diamond', 'Pink Diamond', 'Blue Diamond', 'Black Diamond'];
    },

    getFundType: () => {
        return ['Wallet', 'Wallet Topup'];
    },

    getWalletField: () => {
        return ['wallet', 'wallet_topup'];
    },

    getTopLevelIDsByPoolRE: async (recid, level = 0, pool = 0, arr = []) => {
        try {
            let defaultArr = [];
            let defaultResults = await userreDbHandler.getByQuery({ is_re: true }, { _id: 1 });
            defaultResults.forEach(row => defaultArr.push(row._id));

            if (arr.length === level && level !== 0) {
                return arr;
            } else if (defaultArr.includes(recid)) {
                return arr;
            }
            const result = await userreDbHandler.getById(recid);
            if (result) {
                arr.push(result.placement_id);
                return await getTopLevelIDsByPoolRE(result.placement_id, level, pool, arr);
            } else {
                return arr;
            }
        } catch (error) {
            console.error('Error:', error);
            return arr;
        }
    },

    // put user in the correct place by getting the ID
    getPlacementIDRE: async (placement_uid = 0, unum = 3, pool = 1) => {
        try {
            let placementID = null;
            if (!placement_uid) {
                let defaultResult = await userreDbHandler.getOneByQuery({ is_re: true, pool: pool }, { _id: 1 });
                placementID = defaultResult._id;
            }
            else {
                // Get the latest placement_id
                const latestUserre = await userreModel.findOne({ user_id: placement_uid, pool: pool })
                    .sort({ datetime: -1 })
                    .limit(1)
                    .exec();

                if (!latestUserre) {
                    return null; // No matching user found
                }

                placementID = latestUserre._id;
            }

            let level = [];

            const result = await userreModel.find({ placement_id: placementID }).sort({ datetime: 1 }).exec();
            const num = result.length;

            if (num >= unum) {
                let i = 1;

                while (true) {
                    for (const userre of result) {
                        const subResult = await userreModel.find({ placement_id: userre._id }).sort({ datetime: 1 }).exec();

                        if (subResult.length >= unum) {
                            for (const subUserre of subResult) {
                                level[i + 1] = level[i + 1] || [];
                                level[i + 1].push(subUserre._id);
                            }
                        } else {
                            placementID = userre._id;
                            return await userreModel.findOne({ _id: placementID }).exec();
                        }
                    }

                    if (level[i + 1] && level[i + 1].length) {
                        i++;
                        continue;
                    } else {
                        break;
                    }
                }
            }

            return await userreModel.findOne({ recid: placementID }).exec();
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    },

    // particular pool k levels return karega
    getChildLevelsByPoolRE: async (recid, pool = 1, withRecid = '', l = 3) => {
        try {
            let level = [];

            // Include recid in the first level if withRecid is 'yes'
            if (withRecid === 'yes') {
                const userre = await userreModel.findOne({ _id: recid }).exec();
                level.push([userre]);
            }

            // Get the child levels
            let result = await userreModel.find({ placement_id: recid }).exec();
            let i = 1;

            while (true) {
                for (const value of result) {
                    const subResult = await userreModel.find({ placement_id: value._id }).exec();
                    level[i] = level[i] || [];

                    for (const row of subResult) {
                        level[i].push(row);
                    }
                }

                if (i === l) {
                    break;
                } else if (!level[i + 1] || level[i + 1].length === 0) {
                    break;
                }

                i++;
            }

            return level;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    },

    getChildLevelsByPoolREByUID: async (user_id, pool = 1, level = 1, withRecid = '') => {
        try {
            // Find recid by user_id and pool
            const userreRecid = await Userre.findOne({ user_id: user_id, pool: pool })
                .sort({ datetime: 1 })
                .skip(level - 1)
                .limit(1)
                .exec();

            const recid = userreRecid ? userreRecid._id : -1;

            // Include recid in the first level if withRecid is 'yes'
            let levelArray = [];
            if (withRecid === 'yes') {
                const userre = await userreModel.findOne({ _id: recid }).exec();
                levelArray.push([userre]);
            }

            // Get the child levels
            let result = await Userre.find({ placement_id: recid }).exec();
            let i = 1;

            while (true) {
                for (const value of result) {
                    const subResult = await Userre.find({ placement_id: value._id }).exec();
                    levelArray[i] = levelArray[i] || [];

                    for (const row of subResult) {
                        levelArray[i].push(row);
                    }
                }

                if (i === 2) { // You can change this condition if needed
                    break;
                } else if (!levelArray[i + 1] || levelArray[i + 1].length === 0) {
                    break;
                }
                i++;
            }

            return levelArray;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }
};