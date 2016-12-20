/**
 * Created by anzer on 2016/12/16.
 */
/**
 * Created by anzer on 2016/12/6.
 */
let _ = require('lodash');
let fs = require('fs');
let path = require('path');


/**
 * 用于加载一个目录下的所有模块类（递归），并帕斯卡命名规范化
 */
class Loader {


    constructor(app) {
        this.app = app;
        this.logger = app.logger;
        this.modules = {};
        this.keyCache = {};
    }


    get(key) {

        if (!_.isString(key) || key.length === 0) {
            return null;
        }

        if (this.keyCache.hasOwnProperty(key)) {
            return this.keyCache[key];

        }
        let keySplited = key.split('.').map(item => _.words(item).map(word => _.upperFirst(word)).join(''));
        let obj = this.modules;
        for (let i = 0, len = keySplited.length; i < len; i++) {
            let name = keySplited[i];
            if (obj.hasOwnProperty(name)) {
                obj = obj[name];
                if (i === len - 1) {
                    return this.keyCache[key] = obj.module;
                }
                obj = obj.children;
            } else {
                return null;
            }
        }
        return null;

    }

    getAll() {
        return this.modules;
    }

    forEach(fn) {
        function dfs(modules) {
            for (let key in modules) {
                if (modules[key].module) {
                    fn(modules[key].module, modules[key].pathKey, modules[key].relativePath, key);
                }
                dfs(modules[key].children)
            }
        }

        dfs(this.modules);
        return this;
    }

    load(options = {}) {
        let {
            root,
            suffix = '.js',
            filter = () => true,
            resolve = (item) => item
        }=options;

        this.modules = {};

        let exist = fs.existsSync(root);

        if (!exist) {
            //  this.logger.warn(`Cannot load '${root}',Directory not exist`);
            return this;
        }
        let isDirectory = fs.statSync(root).isDirectory()
        if (!isDirectory) {
            this.logger.warn(`Cannot load '${root}',Not a directory`);
            return this;
        }

        function dfs(dest, relativePath, pathKey) {

            let currentPath = path.join(root, relativePath);
            let filenameList = fs.readdirSync(currentPath);

            for (let filename of filenameList) {
                let name = _.words(path.basename(filename, suffix)).map(word => _.upperFirst(word)).join('');//文件名转化为规范化命名（去除后缀，帕斯卡化）

                if (!dest[name]) {
                    dest[name] = {
                        children: {},
                        module: null,
                        relativePath: path.join(relativePath, filename),
                        pathKey: pathKey.length ? pathKey + '.' + name : name
                    }
                }

                if (fs.statSync(path.join(currentPath, filename)).isDirectory()) {

                    dfs(dest[name].children, dest[name].relativePath, dest[name].pathKey);
                } else if (fs.statSync(path.join(currentPath, filename)).isFile()) {
                    if (suffix && !filename.endsWith(suffix)) {
                        continue;
                    }
                    if (!filter(filename, dest[name].relativePath, dest[name].pathKey)) {
                        continue;
                    }
                    dest[name].relativePath = path.join(relativePath, filename)
                    dest[name].module = resolve(require(path.join(currentPath, filename)));
                }
            }
        }


        try {
            dfs(this.modules, "", "");
        } catch (e) {
            this.logger.warn(e.stack);
        }
        return this;
        // console.log( require('util').inspect(this.modules,{depth: 4}));
    }

}
module.exports = Loader;