/**
 * Created by anzer on 2016/12/16.
 */
let _ = require('lodash');
module.exports = class Router {
    constructor() {
        let methodList = ["get", "post", "delete", 'patch', 'put', 'all'];
        methodList.forEach((method) => {
            this[method] = function (...args) {
                this.route(method, ...args);
            }
        });
        this.routes = [];
    }

    route(method, url, pathKey, methodName) {
        this.routes.push({
            url,
            pathKey: pathKey.split('.').map(key => _.words(key || "").map(word => _.upperFirst(word)).join('')).join('.'),
            methodName,
            method
        })

    }

};