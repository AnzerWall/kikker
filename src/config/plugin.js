'use strict';
/**
 * Created by anzer on 2017/1/22.
 */
let path = require('path');
module.exports = {
    mongoose: {
        enable: true,
        path: path.join(__dirname, '../plugin/mongoose')
    },
    nunjucks: {
        enable: true,
        path: path.join(__dirname, '../plugin/nunjucks')
    },
    validator: {
        enable: true,
        path: path.join(__dirname, '../plugin/validator')
    },
    redis: {
        enable: true,
        path: path.join(__dirname, '../plugin/redis')
    },
    decorator: {
        enable: true,
        path: path.join(__dirname, '../plugin/decorator-core')

    }
}