/**
 * Created by anzer on 2016/12/20.
 */
let Loader = require('../../loader.js');
let Application = require('../../application.js');
let mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

let Schema = mongoose.Schema;
let _ = require('lodash');
function wrap(obj) {
    if (typeof Proxy === 'undefined') {
        let methodList = ['aggregate', 'count', 'create', 'distinct', 'ensureIndexes', 'distinct', 'find', 'findById'
            , 'findById', 'findOneAndRemove', 'findByIdAndRemove', 'findByIdAndUpdate', 'findOne', 'findOneAndUpdate', 'geoNear', 'geoSearch'
            , 'insertMany', 'mapReduce', 'populate', 'remove', 'update', 'where'];
        methodList.forEach(method => {
            obj[method] = obj.Model[method].bind(obj.Model);
        });
        return obj;

    } else {
        //如果是支持Proxy的版本，直接通过proxy代理方法
        return new Proxy(obj, {
            get(target, key, receiver){
                if (Reflect.has(target, key)) {
                    return Reflect.get(target, key, receiver);
                } else {
                    if (Reflect.has(obj.Model, key)) {
                        let val = Reflect.get(obj.Model, key, receiver);
                        if (typeof val === 'function') {
                            return val.bind(obj.Model);
                        } else {
                            return val;
                        }
                    } else {
                        return Reflect.get(target, key, receiver);
                    }

                }
            }
        });
    }

}

class MongoosePlugin {
    init(app) {
        let logger = app.logger;
        let connections = {};

        app.modelFactory((Model, options, databaseName) => {
            if (!connections[databaseName]) {
                connections[databaseName] = mongoose.createConnection(options.uri);
                connections[databaseName].on('error', (err) => {
                    logger.error(`数据库 '${databaseName}' 时发生错误:${err.message}`);
                });
                connections[databaseName].once('open', (err) => {
                    logger.info(`数据库 '${databaseName}' 已连接`);
                });
            }
            let connection = connections[databaseName];
            let modelName = Model.getModelName();
            if (!modelName) {
                logger.warn(`模型名 '${modelName}' 无效`);
                return null;
            }
            let model = new Model(app);
            if (connection.modelNames().indexOf(modelName) != -1) {

                model.Model = connection.model(modelName);
                return wrap(model);
            } else {

                let schemaOptions = {};
                if (_.isFunction(Model.getSchemaOptions, mongoose)) {
                    schemaOptions = Model.getSchemaOptions() || {};
                }
                let schema = {};
                if (_.isFunction(Model.getSchema)) {
                    schema = new Schema(Model.getSchema(Schema.Types, mongoose) || {}, schemaOptions);
                }
                let tableName = modelName;
                if (_.isFunction(Model.getTableName)) {
                    tableName = Model.getTableName();
                }

                model.Model = connection.model(modelName, schema, tableName);
                return wrap(model);
            }


        }, 'mongoose');
    }
}
module.exports = MongoosePlugin;