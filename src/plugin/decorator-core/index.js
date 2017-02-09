"use strict";
/**
 * Created by anzer on 2017/2/4.
 */

/*
 路由装饰器：在controller类里增加一个路由标志信息，Application通过这个信息自动加载路由
 Controller.__private__.route={
 test:{
 url:'/test',
 method:'all'    // ['get','post','delete','put','patch','all']
 }
 }
 */

function checkAndAddRoute(obj) {
    if (!Array.isArray(obj.__routes__)) {
        obj.__routes__ = [];
    }
}
function makeRouteDecorator(url = null, method = 'all') {
    return function (target, key) {
        let Controller = target.constructor;
        checkAndAddRoute(Controller);
        Controller.__routes__.push({
            method: method,
            url: url,
            actionName: key
        });
    };
}

function ALL(url) {
    return makeRouteDecorator(url, 'all');
}
function GET(url) {
    return makeRouteDecorator(url, 'get');
}

function POST(url) {
    return makeRouteDecorator(url, 'post');

}

function PATCH(url) {
    return makeRouteDecorator(url, 'patch');

}
function PUT(url) {
    return makeRouteDecorator(url, 'put');
}
function DELETE(url) {
    return makeRouteDecorator(url, 'delete');

}


module.exports = function (app) {


    return {
        config: {
            decorator: {
                router: {
                    enable: true,
                    global: true
                }
            }
        },
        preinstall(app){
            let config = app.config('decorator').router || {};
            if (config.enable) {
                app.on("route", (router => {
                    let controllers = app.controllers;
                    for (let key in controllers) {
                        let Controller = controllers[key];
                        if (Controller.__routes__) {
                            for (let route of Controller.__routes__) {
                                router[route.method](route.url, key, route.actionName);
                            }
                        }
                    }
                }));
                if (config.global) {
                    global.GET = GET;
                    global.POST = POST;
                    global.PATCH = PATCH;
                    global.DELETE = DELETE;
                    global.PUT = PUT;
                    global.ALL = ALL;
                }

            }
        },
        install(app){


        }
    }
}