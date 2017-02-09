'use strict';
/**
 * Created by anzer on 2017/1/20.
 */
let util = require('./util');
let logger = require('./logger').getLogger('plugin');
let extend = require('extend');
let assert = require('assert');

class Plugins {
    constructor(app) {
        this.app = app;
        this.plugins = {}
    }

    configs() {
        let plugins = this.plugins;
        let configs = [];
        for (let key in plugins) {
            let plugin = plugins[key];
            if (plugin.config) {
                configs.push(plugin.config);
            }
        }
        return extend(true, {}, ...configs);
    }

    load() {
        let config = this.app.configs.plugin;
        let oldModulePaths = module.paths;
        module.paths = module.paths.concat(module.constructor._nodeModulePaths(this.app.APP_PATH));
        for (let key in config) {
            let item = config[key];
            let plugin = {};
            if (item.packageName) {
                plugin = require(item.packageName);
            } else if (item.path) {
                plugin = require(item.path);
            } else {
                logger.warn(`plugin '${key}':You need to specify the path or the packageName`);
            }
            if (util.isFunction(plugin)) {
                this.plugins[key] = plugin(this.app);
            } else {
                logger.warn(`plugin '${key}':Export must a function`);
            }
        }
        module.paths = oldModulePaths;

    }

    preinstall() {
        let plugins = this.plugins;
        for (let key in plugins) {
            let plugin = plugins[key];
            if (util.isFunction(plugin.preinstall)) {
                plugin.preinstall(this.app);
            }
        }
    }

    install() {
        let plugins = this.plugins;

        for (let key in plugins) {
            let plugin = plugins[key];
            if (util.isFunction(plugin.install)) {
                plugin.install(this.app);
            }
        }

    }
}
module.exports = Plugins;