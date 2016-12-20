/**
 * Created by anzer on 2016/12/19.
 */
let Loader = require('../../loader.js');
let path = require('path');
let Joi = require('joi');
let ChineseLanguage = require('./language/zh-cn.js');

module.exports = class JoiValidatorPlugin {
    static getName() {
        return 'JoiValidator';
    }

    init(app, options = {}) {
        this.code = options.code || -400;
        let VALIDATOR_PATH = this.VALIDATOR_PATH = options.VALIDATOR_PATH || path.join(app.APP_PATH, 'validator');
        let loader = this.loader = new Loader(app).load({
            root: VALIDATOR_PATH,
            resolve(item){
                return item(Joi);
            }
        });
        let self = this;
        app.beforeHook(function (ctx) {
            let Validator = loader.get(ctx.pathKey);
            ctx.validated = {};
            if (Validator) {
                let schemaList = Validator[ctx.methodName];
                try {
                    if (schemaList) {
                        if (schemaList.query) {
                            ctx.validated.query = self.validate(ctx.request.query, schemaList.query);
                        }
                        if (schemaList.body) {
                            ctx.validated.body = self.validate(ctx.request.body, schemaList.body);
                        }
                        if (schemaList.params) {
                            ctx.validated.params = self.validate(ctx.params, schemaList.params);
                        }
                        if (schemaList.header) {
                            ctx.validated.header = self.validate(ctx.request.header, schemaList.header, true);
                        }

                    }
                } catch (e) {
                    ctx.body = {
                        code: self.code,
                        message: e.message
                    };
                    ctx.preventNext();
                }

            }

        }, 'joi-validator')
    }

    validate(obj, schema, allowUnknown = false) {

        let ret = Joi.validate(obj, schema, {
            language: ChineseLanguage,
            allowUnknown
        });

        if (ret.error) {
            let message = "Validate Error";
            if (ret.error && ret.error.details && ret.error.details.length) {
                message = ret.error.details[0].message || message;
            }
            throw new Error(message);
        }
        return ret.value;
    }

};