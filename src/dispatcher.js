'use strict';
/**
 * Created by anzer on 2017/1/20.
 */
let assert = require('assert');
let util = require('./util');
let isGeneratorFunction = require('is-generator-function');
let co = require('co');
class Dispatcher {
    constructor(app) {
        this.app = app;
    }

    handle(ctx) {
        const controllerName = ctx.controllerName;
        const actionName = ctx.actionName;
        const beforeHooks = this.app.beforeHooks;
        const afterHooks = this.app.afterHooks;
        const controller = this.app.controller(controllerName, ctx);
        if (controller && util.isFunction(controller[actionName])) {
            let promise = Promise.resolve();

            for (let hook of beforeHooks) {
                promise = promise.then(this.checkAndRun(controller, hook));
            }

            if (util.isFunction(controller.__before__)) {
                promise = promise.then(this.checkAndRun(controller, controller.__before__));
            }

            promise = promise.then(this.checkAndRun(controller, controller[actionName]));

            if (util.isFunction(controller.__after__)) {
                promise = promise.then(this.checkAndRun(controller, controller.__after__));
            }

            for (let hook of afterHooks) {
                promise = promise.then(this.checkAndRun(controller, hook));
            }
            return promise;
        }
        return Promise.resolve();
    }

    checkAndRun(controller, fn) {

        return () => {
            if (!controller._preventNext) {
                return this.runAction(controller, fn)
            } else {
                return Promise.resolve();
            }
        }

    }

    runAction(controller, action) {

        if (action.constructor.name === 'GeneratorFunction') {
            return co.wrap(action).call(controller);
        } else {
            return action.call(controller)
        }

    }

    middleware() {
        return this.handle.bind(this);
    }
}
module.exports = Dispatcher;