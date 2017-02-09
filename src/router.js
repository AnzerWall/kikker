'use strict';
/**
 * Created by anzer on 2017/1/12.
 */
let assert = require('assert');
let util = require('./util');
let logger = require('./logger').getLogger('router')
let pathToRegExp = require('path-to-regexp');
const methodList = ["GET", "POST", "DELETE", 'PATCH', 'PUT', 'ALL'];


function safeDecodeURIComponent(text) {
    try {
        return decodeURIComponent(text);
    } catch (e) {
        return text;
    }
}
class Layer {
    constructor(methods, path, controllerName, actionName) {
        this.methods = methods;
        this.path = path;
        this.controllerName = controllerName;
        this.actionName = actionName;
        this.paramNames = [];
        this.prefix = "";
        this.regexp = pathToRegExp(path, this.paramNames);
    }

    match(ctx) {
        let path = ctx.path;
        let method = ctx.method;
        return this.regexp.test(path) && (this.methods.indexOf(method) !== -1 || this.methods.indexOf('ALL') !== -1);
    }

    setPrefix(prefix) {

        this.prefix = prefix = prefix.replace(/\/$/, '');
        this.paramNames = [];
        this.regexp = pathToRegExp(prefix + this.path, this.paramNames);

    };

    handle(ctx) {
        ctx.params = this.parseParams(ctx);
        ctx.controllerName = this.controllerName;
        ctx.actionName = this.actionName
    }

    parseParams(ctx) {
        let path = ctx.path;
        let captures = path.match(this.regexp).slice(1);
        let params = {};
        let paramNames = this.paramNames;

        for (let i in captures) {
            if (paramNames[i]) {
                let c = captures[i];
                params[paramNames[i].name] = c ? safeDecodeURIComponent(c) : c;
            }
        }
        return params;

    }
}
class Router {
    constructor() {
        this.layers = [];
        this.get = (...args) => this.routes("GET", ...args);
        this.post = (...args) => this.routes("POST", ...args);
        this.delete = (...args) => this.routes("DELETE", ...args);
        this.patch = (...args) => this.routes("PATCH", ...args);
        this.put = (...args) => this.routes("PUT", ...args);
        this.all = (...args) => this.routes("ALL", ...args);
        this.prefix = "";
    }

    routes(method, path, controllerName, actionName) {
        assert(util.isString(method));
        method = method.toUpperCase();
        let methodArray = method.split("|");
        if (methodArray.length > 1) {
            methodArray.forEach(method => assert(methodList.indexOf(method) !== -1))
        } else {
            assert(methodList.indexOf(method) !== -1);
        }
        assert(util.isString(path));
        assert(util.isString(controllerName));
        if (util.isUndefined(actionName)) {
            let arr = controllerName.split('#');
            assert(arr.length === 2);
            controllerName = arr[0];
            actionName = arr[1];
        } else {
            assert(util.isString(actionName));
        }
        controllerName = util.pascalCase(controllerName);
        logger.info(`${methodArray} ${path}  ----> ${controllerName}#${actionName}`);
        let layer = new Layer(methodArray, path, controllerName, actionName);
        if (this.prefix) {
            layer.setPrefix(this.prefix);
        }
        this.layers.push(layer);
        return layer;
    }

    setPrefix(prefix) {
        this.prefix = prefix;
        this.layers.forEach(layer => layer.setPrefix(prefix));
    }

    handle(ctx, next) {
        for (let index in this.layers) {
            let layer = this.layers[index];
            if (layer.match(ctx)) {
                layer.handle(ctx);
                break;
            }
        }
        return next();
    }

    remove(layer) {
        if (layer instanceof Layer) {
            for (let index in this.layers) {
                if (layer === this.layers[i]) {
                    this.layers.splice(i, 1);
                    return;
                }
            }
        }

    }

    middleware() {
        return this.handle.bind(this);
    }
}


module.exports = Router;

