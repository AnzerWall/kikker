"use strict";
/**
 * Created by anzer on 2016/12/20.
 */
let mongoose = require('mongoose');
let util = require('../../util');
mongoose.Promise = require('bluebird');
let Schema = mongoose.Schema;
let Types = Schema.Types;

class ModelFactory {
    constructor(app) {
        this.connections = {};
        this.app = app;
        this.logger = app.getLogger('mongoose');
    }

    model(name, model, databaseName, options) {
        let logger = this.logger;
        if (!this.connections[databaseName]) {
            this.connections[databaseName] = mongoose.createConnection(options.uri);
            this.connections[databaseName].on('error', (err) => {
                logger.error(`Database '${databaseName}' Error:${err.message}`);
            });
            this.connections[databaseName].once('open', (err) => {
                logger.info(`Database '${databaseName}' Connected`);
            });
        }
        let connection = this.connections[databaseName];
        let modelName = model.modelName;
        if (!modelName) {
            logger.warn(`Invalid modelName '${modelName}'`);
            return null;
        }


        if (connection.modelNames().indexOf(modelName) != -1) {

            return connection.model(modelName);

        } else {

            let schemaOptions = model.options || {};
            if (!util.isFunction(model.schema)) {
                logger.warn(`Invalid Schema '${model.schema}'`);
                return null;
            }
            let schema = new Schema(model.schema(Types), schemaOptions);

            return connection.model(modelName, schema, modelName);
        }
    }
}

module.exports = function (app) {
    return {
        install(app){
            app.modelFactory('mongoose', ModelFactory)
        }
    }
}
