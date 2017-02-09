'use strict';
/**
 * Created by anzer on 2017/1/19.
 */
let ApplicationBase = require('koa');
let Loader = require('./loader.js');
let Logger = require('./logger');
let logger = Logger.getLogger('kikker');
let httpLogger = Logger.getLogger('http');

let path = require('path');
let fs = require('fs');
let extend = require('extend');
let Router = require('./router.js');
let util = require('./util');
let http = require('http');
let Plugins = require('./plugins');
let makeController = require('./controller');
let makeService = require('./service');
let assert = require('assert');

let Dispatcher = require('./dispatcher');
let convert = require('koa-convert');
let BodyParser = require('koa-bodyparser');

class Application extends ApplicationBase {

    constructor(options = {}) {
        super();
        const {
            ROOT_PATH,
            APP_PATH,
            CONTROLLER_PATH,
            CONFIG_PATH,
            MODEL_PATH,
            VIEW_PATH,
            SERVICE_PATH,
            UTIL_PATH
        }=options;//指定目录

        //默认开启ip proxy
        this.proxy = true;
        this.ENV = process.env.NODE_ENV || "dev";

        //处理目录，指定当非prod模式时，目录为src，prod模式时目录为dest
        this.ROOT_PATH = ROOT_PATH || process.cwd();
        this.APP_PATH = APP_PATH || (this.ENV === 'prod' ? path.resolve(this.ROOT_PATH, 'dest') : path.resolve(this.ROOT_PATH, 'src'));

        this.LIBRARY_PATH = __dirname;//库目录
        this.LIBRARY_CONFIG_PATH = path.resolve(this.LIBRARY_PATH, 'config');
        this.CONFIG_PATH = CONFIG_PATH || path.resolve(this.APP_PATH, 'config');
        this.CONFIG_PATH_ENV = CONFIG_PATH || path.resolve(this.CONFIG_PATH, this.ENV);

        this.UTIL_PATH = UTIL_PATH || path.resolve(this.APP_PATH, 'util');

        this.CONTROLLER_PATH = CONTROLLER_PATH || path.resolve(this.APP_PATH, 'controller');
        this.SERVICE_PATH = SERVICE_PATH || path.resolve(this.APP_PATH, 'service');

        this.MODEL_PATH = MODEL_PATH || path.resolve(this.APP_PATH, 'model');
        this.VIEW_PATH = VIEW_PATH || path.resolve(this.APP_PATH, 'view');

        this.configs = {};
        this.controllers = {};
        this.utils = {};
        this.models = {};
        this.services = {};
        this.modelFactories = {};
        this.viewEngines = {};
        this.dispatcher = new Dispatcher(this);
        this.plugins = new Plugins(this);
        this.beforeHooks = [];
        this.afterHooks = [];

        this.loadConfigs();//加载库，用户的配置，用户的环境配置
        this.plugins.load();
        this.mixinPluginConfig();//混合plugin配置
        this.plugins.preinstall();
        this.loadServices();
        this.loadControllers();
        this.loadModels();
        this.loadUtils();


        this.on('route', this.route.bind(this));
        this.router = new Router();
        if (this.configs.router.prefix) {
            this.router.setPrefix(this.configs.router.prefix)
        }

        this.use(this.coreMiddleware.bind(this));
        this.use(this.router.middleware());
        this.plugins.install();
        if (this.configs.bodyParser.enable) {
            this.use(BodyParser(this.configs.bodyParser.options))
        }
        this.emit('route', this.router);

    }

    connection(dbName) {

    }

    getLogger(name) {
        return Logger.getLogger(name)
    }

    beforeHook(hook) {
        assert(util.isFunction(hook));
        this.beforeHooks.push(hook);
        return this;
    }

    afterHook(hook) {
        assert(util.isFunction(hook));
        this.afterHooks.push(hook);
        return this;
    }

    coreMiddleware(ctx, next) {
        let startTime = Date.now();
        return next()
            .then(() => {
                if (ctx.response.status === 404) {
                    this.onNotFound(ctx);
                }
            }).catch((e) => {
                this.onError(e, ctx);
            }).finally(() => {
                let responseTime = Date.now() - startTime;
                let mapped = (ctx.controllerName && ctx.actionName) ? ` ${ctx.controllerName}#${ctx.actionName} ` : "";//映射的控制器
                httpLogger.log('verbose', `${ctx.method} ${ctx.url} ${mapped} ${responseTime}ms`);
                ctx.set('X-Response-Time', responseTime + 'ms');
                ctx.set('X-Powered-By', 'kikker');
            });
    }

    makeFailMessage(error, code, ...args) {
        if (util.isNumber(error)) {
            args = code ? [code, ...args] : args;
            code = error;
            error = undefined;
        }
        let libConfig = this.config('lib');
        let errorConfig = this.config('error');
        let messageString = errorConfig[code] || "Unknown Error Code";
        let message = util.format(messageString, ...args);
        let res = {
            [libConfig.codeKey]: code,
            [libConfig.messageKey]: message
        };

        if (libConfig.debug) {
            res[libConfig.errorKey] = error;
        }
        return res;
    }

    onNotFound(ctx) {
        ctx.status = 404;
        ctx.type = 'text/html';
        ctx.body = `<h1>404 Not Found</h1>`;
    }

    onError(err, ctx) {
        ctx.status = 500;
        ctx.type = "text/html";
        logger.error(err.stack || err.message);
        if (this.isDebug()) {
            ctx.body = `<h1 >Internal Server Error</h1>
                        <pre style="color: red">${err.stack || err.message}</pre>`;
        } else {
            ctx.body = `<h1 style="color: red">Internal Server Error</h1>`;
        }

    }

    isDebug() {
        return this.configs.lib.debug === true;
    }


    route(router) {
        if (this.configs.router.route) {
            this.configs.router.route(router);
        }

    }

    controller(name, ctx) {
        if (!ctx) {
            ctx = this.createAnonymousContext();
        }
        name = util.pascalCase(name);
        if (this.controllers[name]) {
            let Controller = this.controllers[name];
            return new Controller(ctx);
        }
        return null;
    }


    createAnonymousContext(req) {
        const request = {
            headers: {
                'x-forwarded-for': '127.0.0.1',
            },
            query: {},
            querystring: '',
            host: '127.0.0.1',
            hostname: '127.0.0.1',
            protocol: 'http',
            secure: 'false',
            method: 'GET',
            url: '/',
            path: '/',
            socket: {
                remoteAddress: '127.0.0.1',
                remotePort: 7001,
            },
        };
        if (req) {
            for (const key in req) {
                if (key === 'headers' || key === 'query' || key === 'socket') {
                    Object.assign(request[key], req[key]);
                } else {
                    request[key] = req[key];
                }
            }
        }
        const response = new http.ServerResponse(request);
        return this.createContext(request, response);
    }

    model(name, databaseName) {
        name = util.camelCase(name);
        if (!this.models[name]) {
            logger.warn(`model '${name}' not found`);
            return null;
        }
        if (!databaseName) {
            databaseName = this.models[name].db;
        }
        let config = this.config('db')[databaseName];
        if (config.type && this.modelFactories[config.type]) {
            let modelFactory = this.modelFactories[config.type];
            return modelFactory.model(name, this.models[name], databaseName, config);
        } else {
            logger.warn(`model '${name}':modelFactory type '${type}' not found`);
            return null;
        }
    }

    view(viewName, data, engine) {

        let viewEngine;
        if (engine) {
            viewEngine = this.viewEngine(engine);
        } else if (this.config('view').engine) {
            viewEngine = this.viewEngine(this.config('view').engine)
        } else if (Object.keys(this.viewEngines).length) {
            viewEngine = this.viewEngines[Object.keys(this.viewEngines)[0]]
        }

        if (!viewEngine) {
            logger.warn(`render view error:Need View Engine`);
            return null;
        }
        return viewEngine.view(viewName, data);

    }

    util(key) {
        key = util.camelCase(key);
        return this.utils[key] || null;
    }

    config(key) {
        key = util.camelCase(key);

        return this.configs[key] || {};
    }

    modelFactory(name, ModelFactory) {
        if (ModelFactory) {
            this.modelFactories[name] = new ModelFactory(this);
        } else {
            return this.modelFactories[name];
        }
    }

    viewEngine(name, ViewEngine) {

        if (ViewEngine) {
            this.viewEngines[name] = new ViewEngine(this);
        } else {
            return this.viewEngines[name];

        }
    }


    loadConfigs() {
        let libConfigs = this.libConfigs = new Loader(this.LIBRARY_CONFIG_PATH).load();
        let userConfigs = this.userConfigs = new Loader(this.CONFIG_PATH).load();
        let userEnvConfigs = this.userEnvConfigs = new Loader(this.CONFIG_PATH_ENV).load();
        this.configs = extend(true, {}, libConfigs, userConfigs, userEnvConfigs);
        // console.log(this.configs);
    }

    mixinPluginConfig() {
        this.pluginConfigs = this.plugins.configs();
        this.configs = extend(true, {}, this.libConfigs, this.pluginConfigs, this.userConfigs, this.userEnvConfigs);
    }

    loadControllers() {
        this.controllers = new Loader(this.CONTROLLER_PATH).load({
            resolve: (controller) => {
                return makeController(controller);
                // this.pluginManager
            },
            namer: util.pascalCase
        });
    }

    loadServices() {
        this.services = new Loader(this.SERVICE_PATH).load({
            resolve: (service) => {
                return makeService(service);
            },
            namer: util.pascalCase
        });
    }

    loadUtils() {
        this.utils = new Loader(this.UTIL_PATH).load();

    }

    loadModels() {
        this.models = new Loader(this.MODEL_PATH).load();
    }


    run() {
        this.use(this.dispatcher.middleware());
        logger.info(`Listen port: ${this.configs.server.port}`);
        this.listen(this.configs.server.port, this.configs.server.host);
    }
}
module.exports = Application;