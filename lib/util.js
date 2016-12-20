/**
 * Created by anzer on 2016/12/20.
 */
let _ = require('lodash');
module.exports = {
    addWhenTableNotExist(obj, key){
        if (!_.isObject(obj[key])) {
            obj[key] = {};
        }
    }
};