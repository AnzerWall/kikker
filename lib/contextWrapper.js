/**
 * Created by anzer on 2016/12/19.
 * 赋予koa context一些有用的方法
 */
let _ = require('lodash');
let {addWhenTableNotExist}=require('./util.js');
let util = require('util');
let fs = require('fs');
/**
 * 根据key，获取Model，并根据Model.getDatabase()读取config/db.js下不同的配置项，调用不同的modelFactory实例化Model
 * @param key
 * @returns {*}
 */
function model(key) {
    //为当前上下文缓存实例化的model
    if (!_.isObject(this.__private__.models)) {
        this.__private__.models = {};
    }
    if (this.__private__.models[key]) {
        return this.__private__.models[key];
    }


    let app = this.__private__.app;
    let ModelLoader = app.__private__.ModelLoader;
    let Model = ModelLoader.get(key);

    if (!Model) {
        app.logger.warn(`Controller.model(): Model '${key}' not found!`);
        return null;
    } else {
        if (!_.isFunction(Model.getDatabase)) {
            app.logger.warn(`Controller.model():Model need a static method 'getDatabase()' to tell engine database config which is  needed!`);
            return null;
        }
        let databaseName = Model.getDatabase();
        let databaseConfig = app.config('db');
        if (!_.isString(databaseName) || !databaseConfig[databaseName]) {
            app.logger.warn(`Controller.model():Model.getDatabase() => ${databaseName} is invalid!`);
            return null;
        } else {
            let type = databaseConfig[databaseName].type;
            if (!_.isString(type) || !app.__private__.modelFactory[type]) {
                app.logger.warn(`Controller.model():app.config('db').${databaseName}.type => '${type}' is invalid`);
            } else {
                return app.__private__.modelFactory[type](Model, databaseConfig[databaseName], databaseName, key);
            }
        }

    }
}

/**
 * 设置固定的json格式响应，表示本次api调用顺利进行
 * @param data 传递给前端的数据
 * @param message
 */
function success(data, message = "success") {
    this.status = 200;
    this.response.type = "application/json";

    this.body = {
        code: 0,
        message: message,
        data: data
    };
}
/**
 * 设置固定的json格式响应，表示本次api调用出现异常，并自动地根据code读取error.js对应的语言信息填充message,支持util.format格式化消息
 * @param code
 * @param error 额外的错误信息，调试使用，当环境为dev时有效
 */
function fail(code, error, ...args) {
    let app = this.__private__.app;
    this.status = 200;
    this.response.type = "application/json";
    let lang = this.lang();

    let errorConfig = app.config('error')[lang] || {};
    let message = util.format(errorConfig[code] || 'Unknown Error Code', ...args);
    this.ctx.body = {
        code,
        message,
        error
    };
}
/**
 * 从query.local或者header里获取与配置匹配的最佳语言，不匹配则返回default
 * @returns {*}
 */
function lang() {
    let acceptLanguages = [];
    if (_.isArray(app.config('i18n').acceptLanguages)) {
        acceptLanguages = app.config('i18n').acceptLanguages;
    }
    if (this.request.query.local && acceptLanguages.includes(this.request.query.local)) {
        return this.request.query.local;
    } else {
        return this.request.acceptsLanguages(lang) || 'default';
    }
}
/**
 * 以最佳语言返回匹配key的字符串('config/i18n.js')，并支持util.format
 * @param key
 * @param args
 * @returns {string}
 */
function i18n(key, ...args) {
    let app = this.__private__.app;
    let lang = this.lang;
    let config = app.config('i18n')['lang'] || {};
    return util.format(config[key] || '', ...args);
}
/**
 * 设置一个json格式的响应
 * @param data json
 */
function json(data) {
    this.status = 200;
    this.body = data;
    this.response.type = "application/json";

}
/**
 *以字符串设置响应，并设置content-type为'text/xml'
 * @param text 纯文本的数据
 */
function xmlText(text) {
    this.status = 200;
    this.response.type = "text/xml";
    this.body = text;
}
/**
 * 以字符串设置响应
 * @param str
 */

function string(str) {
    this.status = 200;
    this.body = str;
}
/**
 * 以字符串设置响应，并设置content-type为'text/html'
 * @param html
 */
function html(html) {
    this.status = 200;
    this.response.type = "text/html";
    this.body = html;
}


function download(filePath, _filename, _contentType) {
    let filename = _filename || path.basename(filePath);
    let contentType = require('mime').lookup(_contentType || filePath);
    this.response.attachment(filename);
    this.response.type = contentType;
    this.body = fs.createReadStream(filePath);
}

function jsonp(data) {
    let app = this.__private__.app;
    let serverConfig = app.config('server');
    let callbackName = this.query[serverConfig.jsonp_callback_key || "callback"] || "callback";
    //remove unsafe chars
    callbackName = callbackName.replace(/[^\w\.]/g, '');
    if (callbackName) {
        this.response.type = "text/javascript";
        this.body = callbackName + '(' + (data !== undefined ? JSON.stringify(data) : '') + ')';
    }
}
function preventNext() {
    this.__private__.preventNext = true;
}
module.exports = {
    wrap(ctx){
        ctx.__private__.preventNext = false;
        ctx.preventNext = preventNext;
        ctx.jsonp = jsonp;
        ctx.download = download;
        ctx.html = html;
        ctx.string = string;
        ctx.xmlText = xmlText;
        ctx.json = json;
        ctx.fail = fail;
        ctx.success = success;
        ctx.model = model;
        ctx.lang = lang;
        ctx.i18n = i18n;

        ctx.data = ctx.method === 'POST' ? ctx.request.body : ctx.query;

    }
};