/**
 * Created by anzer on 2016/12/16.
 */
let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let EventEmitter = require('events').EventEmitter;
let winston = require('winston');
let moment = require('moment');
let Loader = require('./loader.js');
let Koa = require('koa');
let Router = require('./router.js');
let methodList = ["get", "post", "delete", 'patch', 'put', 'all'];
let BodyParser = require('koa-bodyparser');
let ContextWrapper = require('./contextWrapper.js');
let Decorator = require('./decorator.js');
module.exports = class Application extends EventEmitter {
    constructor(options = {}) {
        super();

        const {ROOT_PATH, APP_PATH, CONTROLLER_PATH, CONFIG_PATH, MODEL_PATH, VIEW_PATH, logger, logLevel}=options;
        this.ROOT_PATH = ROOT_PATH || process.cwd();
        this.APP_PATH = APP_PATH || path.resolve(this.ROOT_PATH, 'app');

        this.LIBRARY_PATH = __dirname;//库目录
        this.CONFIG_PATH = CONFIG_PATH || path.resolve(this.APP_PATH, 'config');

        this.CONTROLLER_PATH = CONTROLLER_PATH || path.resolve(this.APP_PATH, 'controller');
        this.MODEL_PATH = MODEL_PATH || path.resolve(this.APP_PATH, 'model');
        this.VIEW_PATH = VIEW_PATH || path.resolve(this.APP_PATH, 'view');
        this.ENV = options.env || process.env.NODE_ENV || "";
        this.logger = logger || new (winston.Logger)({
                transports: [
                    new (winston.transports.Console)({
                        colorize: true,
                        level: logLevel || 'verbose',
                        timestamp: _ => moment().format("MM/DD HH:mm:SS"),
                        label: "CORE"
                    }),
                ]
            });
        this.Version = '0.0.1';

        if (fs.existsSync(path.join(__dirname, 'package.json'))) {
            this.Version = require('./package.json').version;
        } else {
            this.Version = require('../package.json').version;
        }

        this.__private__ = {};

        this.__private__.beforeHooks = [];
        this.__private__.afterHooks = [];
        this.__private__.middlewares = [];


        this.__private__.middlewareTable = {};
        this.__private__.beforeHookTable = {};
        this.__private__.afterHookTable = {};

        this.__private__.ControllerLoader = new Loader(this);
        this.__private__.ConfigLoader = new Loader(this);
        this.__private__.ModelLoader = new Loader(this);

        this.__private__.ConfigCache = {};

        this.__private__.isRunning = false;
        this.__private__.isLoaded = false;
        this.__private__.isAutoRouted = false;
        this.__private__.isDecoratorRouted = false;

        this.__private__.routes = [];
        this.__private__.router = new Router();
        this.__private__.routerOption = {};
        this.__private__.bodyParserOption = {};
        this.__private__.contextWrapper = {};
        this.__private__.whenEventCallbackTabel = {};
        this.__private__.plugins = {};
        this.__private__.modelFactory = {};
        methodList.forEach((method) => this[method] = function (...args) {
            return this.route(method, ...args);
        });//路由方法
        this.koa = new Koa();
        this.logger.info(`Version ${this.Version}`);
    }

    load() {
        if (this.__private__.isLoaded === false) {
            this.__private__.isLoaded = true;
            this.__private__.ControllerLoader.load({root: this.CONTROLLER_PATH});

            this.__private__.ConfigLoader.load({root: this.CONFIG_PATH});
            this.__private__.ModelLoader.load({root: this.MODEL_PATH});

        }

    }

    env() {
        return this.ENV;
    }

    globalizeRouteDecorator() {
        Decorator.globalizeRouteDecorator();
        return this;
    }

    globalizeDataBaseDecorator() {
        Decorator.globalizeDatabaseDecorator();
        return this;
    }
    static pascalCase(key) {
        return _.words(key || "").map(word => _.upperFirst(word)).join('');
    }

    middleware(middleware, name) {
        name = name || "Middleware-" + (this.__private__.middlewares.length + 1);
        this.__private__.middlewares.push(middleware);
        this.__private__.middlewareTable[name] = middleware;
        return this;
    }

    beforeHook(hook, name) {
        name = name || "BeforeHook-" + (this.__private__.beforeHooks.length + 1);
        this.__private__.beforeHooks.push(hook);
        this.__private__.beforeHookTable[name] = hook;
        return this;


    }

    afterHook(hook, name) {
        name = name || "AfterHook-" + (this.__private__.afterHooks.length + 1);
        this.__private__.afterHooks.push(hook);
        this.__private__.afterHookTable[name] = hook;
        return this;

    }

    do(fn) {
        fn(this);
        return this;
    }

    config(name) {
        if (this.__private__.ConfigCache.hasOwnProperty(name)) {
            return this.__private__.ConfigCache[name];
        }
        let pathKey = Application.pascalCase(name);
        let result = {};
        let baseConfig = this.__private__.ConfigLoader.get(pathKey);
        let envConfig = this.__private__.ConfigLoader.get(this.ENV + "." + pathKey);
        if (baseConfig) _.extend(result, baseConfig);
        if (envConfig) _.extend(result, envConfig);
        return this.__private__.ConfigCache[name] = result;
    }

    plugin(Plugin, ...args) {
        let plugin = new Plugin(this);
        plugin.init(this, ...args);

        let name = 'plugin-' + Object.getOwnPropertyNames(this.__private__.plugins).length + 1;
        if (Plugin.getName) {
            name = Plugin.getName() || name;
        }
        this.__private__.plugins[name] = plugin;
        return this;
    }

    autoRoute() {
        if (this.__private__.isAutoRouted) {
            return this;
        }
        this.load();

        this.__private__.ControllerLoader.forEach((controller, pathKey, __, key) => {
            let autoRouteList = [
                {methodName: "listApi", url: "", method: "get"},
                {methodName: "addApi", url: "", method: "post"},
                {methodName: "getApi", url: `/:${_.camelCase(key)}Id`, method: "get"},
                {methodName: "updateApi", url: `/:${_.camelCase(key)}Id`, method: "post"},
                {methodName: "deleteApi", url: `/:${_.camelCase(key)}Id`, method: "delete"},
                {methodName: "deleteListApi", url: '', method: "delete"}];
            let urlRoot = "/" + pathKey.split('.').map(item => (_.words(item).map(word => word.toLowerCase()).join('-'))).join('/');

            for (let route of autoRouteList) {

                if (Application.isClassOrObjectHaveMethod(controller, route.methodName)) {
                    this.__private__.routes.push({
                        url: urlRoot + route.url,
                        methodName: route.methodName,
                        method: route.method,
                        pathKey
                    })
                }


            }

        });
        this.__private__.autoRoute = true;
        return this;
    }

    decoratorRoute() {
        if (this.__private__.isDecoratorRouted) {
            return this;
        }
        this.load();

        this.__private__.ControllerLoader.forEach((controller, pathKey) => {
            if (controller.__private__ && controller.__private__.routes) {
                let routes = controller.__private__.routes;
                for (let key in routes) {
                    let route = routes[key];
                    if (route.url != null) {
                        this.__private__.routes.push({
                            url: route.url,
                            method: route.method,
                            methodName: key,
                            pathKey
                        })
                    }
                }
            }
        });
        this.__private__.isDecoratorRouted = true;
        return this;
    }

    route(method, url, pathKey, methodName) {
        let router = this.__private__.router;
        if (typeof method === 'function') {
            this.load();
            let fn = method;
            fn(router, this, this.__private__.ControllerLoader);
        } else {
            router.route(method, url, pathKey, methodName);
        }
        return this;


    }

    static isObject(obj) {
        return typeof obj === 'object';
    }


    static isClassOrObjectHaveMethod(obj, methodName) {
        if (!Application.isObject(obj)) {
            return typeof obj.prototype[methodName] == 'function';
        } else {
            return typeof obj[methodName] == 'function';
        }
    }

    routerOption(options) {
        this.__private__.routerOption = options;
        return this;
    }

    bodyParserOption(options) {
        this.__private__.bodyParserOption = options;
        return this;
    }

    when(event, fn) {
        if (_.isStirng(event) && _.isFunction(this.__private__.whenEventCallbackTabel[event])) {
            this.__private__.whenEventCallbackTabel[event] = fn;
        }
        return this;
    }

    emitWhen(event, ...args) {
        if (_.isString(event) && _.isFunction(this.__private__.whenEventCallbackTabel[event])) {
            return this.__private__.whenEventCallbackTabel[event](...args);
        }
        return null;
    }

    modelFactory(fn, name) {
        if (_.isFunction(fn) && _.isString(name) && this.__private__.modelFactory[name] === undefined) {
            this.__private__.modelFactory[name] = fn;
        } else {
            this.logger.warn('app.modelFactory():invalid param');
        }
    }

    contextWrapper(wrapper, name) {
        if (!name) {
            name = 'context-wrapper-' + Object.getOwnPropertyNames(this.__private__.contextWrapper).length + 1;
        }
        this.__private__.contextWrapper[name] = wrapper;
    }

    use(...args) {
        return this.middleware(...args)
    }

    run(_port, _host) {
        let app = this;
        let Private = app.__private__;
        if (Private.isRunning) {
            Private.isRunning = true;
            app.logger.warn('Application.run():Application is already run');
            return;
        }

        app.load();

        let port = (app.config('server').port || _port ) || 3000;
        let host = app.config('server').host || _host;
        let routerOption = _.extend(this.config('route').options || {}, Private.routerOption);
        let router = require('koa-router')(routerOption);
        let routes = Private.routes.concat(Private.router.routes);


        routes.forEach(item => {
            let {url, pathKey, methodName, method}=item;
            if (url && pathKey && methodName && methodList.indexOf(method) != -1) {
                let Controller = Private.ControllerLoader.get(pathKey);
                if (Controller && Application.isClassOrObjectHaveMethod(Controller, methodName)) {
                    this.logger.log('verbose', `route: ${url} ${method.toUpperCase()} ---> ${pathKey}.${methodName}()`);

                    router[method](url, async function (ctx, next) {

                        ContextWrapper.wrap(ctx);
                        for (let key in Private.contextWrapper) {
                            let wrapper = Private.contextWrapper[key];
                            wrapper(ctx, app);
                        }

                        ctx.pathKey = pathKey;
                        ctx.routePath = url;
                        ctx.methodName = methodName;
                        let controller = new Controller(app);

                        if (_.isFunction(controller.__beforeALL__)) {
                            await controller.__beforeALL__(ctx, app)
                        }
                        for (let item of Private.beforeHooks) {
                            if (ctx.__private__.preventNext !== true) {
                                await item(ctx, app);
                            }
                        }
                        if (ctx.__private__.preventNext !== true && _.isFunction(controller.__before__)) {
                            await controller.__before__(ctx, app)
                        }
                        if (ctx.__private__.preventNext !== true) {
                            await controller[methodName](ctx, app);
                        }
                        if (ctx.__private__.preventNext !== true && _.isFunction(controller.__after__)) {
                            await controller.__after__(ctx, app)
                        }
                        for (let item of Private.afterHooks) {
                            if (ctx.__private__.preventNext !== true) {
                                await item(ctx, app);
                            }
                        }
                        if (ctx.__private__.preventNext !== true && _.isFunction(controller.__afterALL__)) {
                            await controller.__afterALL__(ctx, app)
                        }
                    });
                }
            }
        });

        let bodyParserMiddleware = BodyParser(Private.bodyParserOption);
        let routerMiddleware = router.routes();

        let composedMiddleware = this.emitWhen('compose-middleware', Private.middlewares, bodyParserMiddleware);
        if (!Array.isArray(composedMiddleware)) {
            composedMiddleware = [bodyParserMiddleware, ...Private.middlewares, routerMiddleware];
        } else {
            composedMiddleware.push(routerMiddleware);
        }

        let composedBeforeHooks = this.emitWhen('compose-before-hook', Private.beforeHooks);
        if (Array.isArray(composedBeforeHooks)) {
            Private.beforeHooks = composedBeforeHooks;
        }
        let composedAfterHooks = this.emitWhen('compose-after-hook', Private.afterHooks);
        if (Array.isArray(composedAfterHooks)) {
            Private.afterHooks = composedAfterHooks;
        }

        app.koa.use(async function (ctx, next) {
            ctx.__private__ = {};
            ctx.__private__.app = app;
            let startTime = Date.now();
            try {
                await next();
            } catch (e) {
                ctx.status = 500;
                ctx.body = {
                    code: -1,
                    message: e.message,
                    error: e.stack || e
                };
                app.logger.error(e);
            }
            let responseTime = Date.now() - startTime;
            app.logger.log('verbose', `${ctx.method} ${ctx.url} ${responseTime}ms`);
            ctx.set('X-Response-Time', responseTime + 'ms');
            ctx.set('X-Powered-By', 'kikker');
        });
        composedMiddleware.forEach(item => {
            app.koa.use(item)
        });

        app.koa.listen(port, host);
        this.logger.info(`Listen port: ${port}`);

    }
};
global.Promise = require('bluebird');
