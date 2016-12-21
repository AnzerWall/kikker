/**
 * Created by anzer on 2016/12/6.
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
function checkAndAddPrivate(obj) {
    if (typeof obj.__private__ != 'object') {
        obj.__private__ = {};
    }
}
function checkAndAddRoute(obj) {
    if (typeof obj.__private__.routes != 'object') {
        obj.__private__.routes = {};
    }
}
function makeRouteDecorator(url = null, method = 'all') {
    return function (target, key) {
        let Controller = target.constructor;
        checkAndAddPrivate(Controller);
        checkAndAddRoute(Controller);
        if (!Controller.__private__.routes[key]) {
            Controller.__private__.routes[key] = {
                method: 'all',
                url: null
            }
        }
        if (url) Controller.__private__.routes[key].url = url;
        if (method) Controller.__private__.routes[key].method = method;
    };
}
function ROUTE(options = {}) {
    let {url = null, method = 'all'}=options;
    return makeRouteDecorator(url, method);
}

function URL(url) {
    return makeRouteDecorator(url, null);
}
function GET(target, key) {
    return makeRouteDecorator(null, 'get')(target, key);
}

function POST(target, key) {
    return makeRouteDecorator(null, 'post')(target, key);
}


function PATCH(target, key) {
    return makeRouteDecorator(null, 'patch')(target, key);

}
function PUT(target, key) {
    return makeRouteDecorator(null, 'put')(target, key);

}
function DELETE(target, key) {
    return makeRouteDecorator(null, 'delete')(target, key);
}
function DB(databaseName) {
    return function (target) {
        target.getDatabase = function () {
            return databaseName;
        }
    }
}

module.exports = {
    ROUTE,
    GET,
    POST,
    PATCH,
    DELETE,
    PUT,
    URL,
    DB,
    globalizeRouteDecorator(){
        global.ROUTE = ROUTE;
        global.GET = GET;
        global.POST = POST;
        global.PATCH = PATCH;
        global.DELETE = DELETE;
        global.PUT = PUT;
        global.URL = URL;
    },
    globalizeDatabaseDecorator(){
        global.DB = DB;
    }
};