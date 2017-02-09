'use strict';
/**
 * Created by anzer on 2017/1/20.
 */
let delegate = require('delegates');

module.exports = function (superClass) {
    let Cls = class Service extends superClass {
        constructor(ctrl) {
            super();
            this.ctrl = ctrl;
            this.ctx = ctrl.ctx;
            this.app = ctrl.app;
            this.request = ctrl.request;
            this.response = ctrl.response;

        }
    };
    delegate(Cls.prototype, 'ctx')
        .access('controllerName')
        .access('actionName');

    delegate(Cls.prototype, 'app')
        .method('config')
        .method('util');


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

    delegate(Cls.prototype, 'ctrl')
        .access('header')
        .access('headers')
        .access('params')
        .access('body')
        .access('query')
        .access('ip')
        .getter('userAgent')
        .getter('referrer')
        .getter('referrer')
        .getter('isPreventNext')
        .method('isGet')
        .method('isPost')
        .method('isMethod')
        .method('xml')
        .method('string')
        .method('html')
        .method('download')
        .method('redirect')
        .method('view')
        .method('render')
        .method('json')
        .method('preventNext')
        .method('success')
        .method('fail')
        .method('view')
        .method('model')
        .method('view')
        .method('controller')
        .method('service');

    return Cls;
}