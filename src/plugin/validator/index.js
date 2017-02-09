"use strict";

/**
 * Created by anzer on 2016/12/19.
 */

let Loader = require('../../loader.js');
let util = require('../../util.js');
let path = require('path');
let Joi = require('joi');
let extend = require('extend');

class ValidatorManager {
    constructor(app) {
        this.app = app;
        this.options = app.config('validator');
        let Joi = this.Joi = this.options.Joi;
        this.VALIDATOR_PATH = path.join(app.APP_PATH, this.options.path);
        this.validators = new Loader(this.VALIDATOR_PATH).load({
            namer: util.pascalCase,
            resolve(validator){
                return validator(Joi)
            }
        });

    }

    handle(manager) {

        let Validator = manager.validators[this.controllerName];
        let options = manager.options;
        let Joi = options.Joi;
        let code = options.code || "-400";

        if (Validator) {
            let schema = Validator[this.actionName];

            if (schema) {
                if (schema.query) {
                    let ret = Joi.validate(this.query, schema.query, options.query);
                    if (ret.error && ret.error.details && ret.error.details.length) {
                        return this.fail(ret.error, code, ret.error.details[0].message);
                    }
                    this.query = ret.value;
                }
                if (schema.body) {
                    let ret = Joi.validate(this.body, schema.body, options.body);

                    if (ret.error && ret.error.details && ret.error.details.length) {
                        return this.fail(ret.error, code, ret.error.details[0].message);
                    }

                    this.body = ret.value;
                }
                if (schema.params) {
                    let ret = Joi.validate(this.params, schema.params, options.params);

                    if (ret.error && ret.error.details && ret.error.details.length) {
                        return this.fail(ret.error, code, ret.error.details[0].message);
                    }
                    this.params = ret.value;
                }
                if (schema.header) {
                    let ret = Joi.validate(this.header, schema.header, options.header);

                    if (ret.error && ret.error.details && ret.error.details.length) {
                        return this.fail(ret.error, code, ret.error.details[0].message);
                    }
                    this.headers = this.header = ret.value;
                }

            }
        }
    }

    hook() {
        let self = this;
        return function () {
            self.handle.call(this, self);
        }
    }
}

module.exports = function (app) {

    return {
        config: {
            validator: {
                Joi: Joi,
                path: "validator",
                code: -400,
                query: {allowUnknown: true},
                params: {},
                body: {},
                header: {allowUnknown: true}
            },
            error: {
                "-400": "Validator Error: %s"
            }
        },
        install(app, controllers){
            let validators = new ValidatorManager(app);
            app.validators = validators;
            app.beforeHook(validators.hook());


        }
    };

};
