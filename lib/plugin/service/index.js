/**
 * Created by anzer on 2016/12/20.
 */
/**
 * Created by anzer on 2016/11/16.
 */
let Loader = require('../../loader.js');

let path = require('path');
let _ = require('lodash');
function wrapFunction(fn, ctx, app) {
    return function (...args) {
        return fn(...args, ctx, app);
    }
}
function wrap(obj, ctx, app) {
    for (let key of Object.getOwnPropertyNames(obj.__proto__)) {
        let fn = obj.__proto__[key];
        if (_.isFunction(fn)) {
            obj[key] = wrapFunction(fn, ctx, app);
        }
    }
    return obj;
}

class ServicePlugin {


    static getName() {
        return 'Service';
    }

    init(app, options = {}) {
        let self = this;
        let SERVICE_PATH = options.SERVICE_PATH || path.join(app.APP_PATH, 'service');
        let loader = this.loader = new Loader(app).load({root: SERVICE_PATH});
        app.contextWrapper((ctx) => {
            ctx.service = function (key, ...args) {
                if (!ctx.serviceCache) {
                    ctx.serviceCache = {};
                }
                if (ctx.serviceCache[key]) {
                    return ctx.serviceCache[key];
                }

                let UserService = loader.get(key);
                if (UserService) {
                    return ctx.serviceCache[key] = wrap(new UserService(app, ...args), ctx, app);
                }
                else {
                    app.coreLogger.warn(`指定的服务'${key}'未找到!`);
                    return null;
                }
            };
            ctx.hasService = function (key) {
                return loader.get(key) != null;
            }
        });
    }
}
module.exports = ServicePlugin;
