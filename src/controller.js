'use strict';
/**
 * Created by anzer on 2017/1/20.
 */
let delegate = require('delegates');
let mime = require('mime');
let fs = require('fs');
let format = require('util').format;
let path = require('path');
let util = require('./util');
let json2xml = require('json2xml');
let isPromise = require('ispromise');
let assert = require('assert');

module.exports = function (superClass) {
    let Cls = class Controller extends superClass {
        constructor(ctx) {
            super();
            this.ctx = ctx;
            this.app = ctx.app;
            this.request = ctx.request;
            this.response = ctx.response;


            this._preventNext = false;


            this.header = ctx.header || {};
            this.headers = ctx.headers || {};
            this.params = ctx.params || {};
            this.body = ctx.request.body || {};
            this.query = ctx.query || {};


            this._controller = {};
            this._model = {};
            this._service = {};
            if (this.__init__) {
                this.__init__();
            }

        }

        get userAgent() {
            return this.header['user-agent'] || '';
        }

        get referrer() {
            return this.headers['referer'] || this.headers['referrer'] || ''
        }

        get referer() {
            return this.referrer;
        }

        // cookie(name, value, options) {
        //     return this.http.cookie(name, value, options);
        // }

        isGet() {
            return this.ctx.method === 'GET'
        }

        isPost() {
            return this.ctx.method === 'POST';
        }

        isAjax() {
            return this.header['x-requested-with'] === 'XMLHttpRequest';
        }

        isMethod(method) {
            return this.request.method === method.toUpperCase();
        }

        xml(data) {
            this.response.status = 200;
            this.response.type = "text/xml";
            this.response.body = json2xml(data);
            this.preventNext();

        }

        string(str) {
            this.response.status = 200;
            this.response.body = str;
            this.preventNext();

        }

        html(html) {
            this.response.status = 200;
            this.response.type = "text/html";
            this.response.body = html;
            this.preventNext();

        }

        download(filePath, filename, contentType) {
            if (!fs.existsSync(filePath)) {
                throw new Error('File Not Found')
            }
            if (arguments.length < 2) {
                filename = path.basename(filePath);
            }
            if (arguments.length < 3) {
                contentType = mime.lookup(filename);
            }
            this.response.attachment(filename);
            this.response.type = contentType;
            this.response.body = fs.createReadStream(filePath);
            this.preventNext();

        }

        // jsonp(data) {
        //     let app = this.app;
        //     let serverConfig = app.config('server');
        //     let ctx = this.ctx;
        //     let callbackName = ctx.query[serverConfig.jsonpKey || "callback"] || "callback";
        //     //remove unsafe chars
        //     callbackName = callbackName.replace(/[^\w\.]/g, '');
        //     if (callbackName) {
        //         ctx.response.type = "text/javascript";
        //         ctx.body = callbackName + '(' + (data !== undefined ? JSON.stringify(data) : '') + ')';
        //     }
        // }
        redirect(url) {
            this.response.redirect(url);
            this.preventNext();
        }


        render(viewName, data, engine) {


            let ret = this.app.view(viewName, data, engine);
            if (isPromise(ret)) {
                return ret.then((data) => {
                    this.response.status = 200;
                    this.response.type = "text/html";
                    this.response.body = data;
                    this.preventNext();
                });


            } else {
                this.response.status = 200;
                this.response.type = "text/html";
                this.response.body = ret;
                this.preventNext();
                return Promise.resolve();
            }
        }

        json(data) {
            this.response.status = 200;
            this.response.body = data;
            this.response.type = "application/json";
            this.preventNext();

        }

        preventNext() {
            this._preventNext = true;
        }

        get isPreventNext() {
            return this._preventNext === true;
        }


        success(data, message) {
            let response = this.response;
            let libConfig = this.app.config('lib');

            response.status = 200;
            response.type = "application/json";
            response.body = {
                [libConfig.codeKey]: 0,
                [libConfig.messageKey]: message,
                [libConfig.dataKey]: data
            };
            this.preventNext();

        }

        fail(error, code, ...args) {
            this.response.status = 200;
            this.response.type = "application/json";
            this.response.body = this.app.makeFailMessage(error, code, ...args);
            this.preventNext();

        }

        get ip() {
            if (this._ip) {
                return this._ip;
            }
            const ip = this.ips[0] || this.socket.remoteAddress;
            // will be '::ffff:x.x.x.x', should conver to standard IPv4 format
            // https://zh.wikipedia.org/wiki/IPv6
            this._ip = ip && ip.indexOf('::ffff:') > -1 ? ip.substring(7) : ip;
            return this._ip;
        }

        set ip(ip) {
            this._ip = ip;
        }


        model(key, ...args) {
            if (this._model[key]) {
                return this._model[key];
            }
            return this._model[key] = this.app.model(key, ...args);
        }

        controller(key) {
            if (this._controller[key]) {
                return this._controller[key];
            }
            return this._controller[key] = this.app.controller(key, this.ctx);
        }

        service(name) {
            if (this._service[name]) {
                return this._service[name];
            }
            name = util.pascalCase(name);
            if (this.app.services[name]) {
                let Service = this.app.services[name];
                return this._service[name] = new Service(this);
            } else {
                return null;
            }
        }


    };
    delegate(Cls.prototype, 'ctx')
        .access('controllerName')
        .access('actionName');

    delegate(Cls.prototype, 'app')
        .access('configs')
        .method('config')
        .method('util')
        .method('view');


    delegate(Cls.prototype, 'request')
        .method('acceptsLanguages')
        .method('acceptsEncodings')
        .method('acceptsCharsets')
        .method('accepts')
        .method('get')
        .method('is')
        .access('querystring')
        .access('idempotent')
        .access('socket')
        .access('search')
        .access('method')
        .access('path')
        .access('url')
        .getter('origin')
        .getter('href')
        .getter('subdomains')
        .getter('protocol')
        .getter('host')
        .getter('hostname')
        .getter('secure')
        .getter('stale')
        .getter('fresh')
        .getter('ip');


    return Cls;
};