'use strict';
/**
 * Created by anzer on 2017/1/20.
 */

let util = require('./util');
let path = require('path');
let fs = require('fs');
let logger = require('./logger').getLogger('loader');
let assert = require('assert');


class Loader {
    constructor(rootPath) {
        this.rootPath = rootPath;
        this.modules = {};
        this.loaded = false;
    }

    load(options = {}) {
        if (!this.loaded) {
            let {
                suffix = ".js",
                filter,
                resolve,
                checker,
                namer = util.camelCase
            }=options;
            let rootPath = this.rootPath;
            try {
                const exist = fs.existsSync(rootPath);
                if (!exist) {
                    return {};
                }
                let filenameList = fs.readdirSync(rootPath);
                for (let filename of filenameList) {
                    let key = namer(path.basename(filename, suffix));
                    let currentPath = path.join(rootPath, filename);
                    let stat = fs.statSync(currentPath);
                    if (filter) {
                        if (!filter(filename)) {
                            continue;
                        }
                    }
                    if (stat.isFile()) {
                        let value = require(currentPath);
                        // 处理es6 module，babel支持
                        if (typeof value === 'object' && value.hasOwnProperty('default') && value.hasOwnProperty('__esModule')) {
                            value = value.default;
                        }
                        if (checker) {
                            if (!checker(value)) {
                                continue;
                            }
                        }

                        if (!this.modules.hasOwnProperty(key)) {
                            if (resolve) {
                                value = resolve(value);
                            }
                            this.modules[key] = value;

                        } else {
                            logger.warn(`load module '${currentPath}'  as key '${key}',key '${key}' already exists`);
                        }

                    }
                }
                this.loaded = true;
            } catch (e) {
                logger.error(e)
            }
        }

        return this.modules;

    }
}
module.exports = Loader;