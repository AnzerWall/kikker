'use strict';
/**
 * Created by anzer on 2017/1/20.
 */
let winston = require('winston');
let moment = require('moment');
let level = 'verbose';

module.exports = {
    getLogger (name) {
        name = name.toUpperCase();
        if (!winston.loggers.has(name)) {
            return winston.loggers.add(name, {
                transports: [
                    new (winston.transports.Console)({
                        colorize: true,
                        level: level,
                        timestamp: _ => moment().format("MM/DD HH:mm:SS"),
                        label: name
                    }),
                ]
            })
        } else {
            return winston.loggers.get(name);
        }
    },
    level(lv){
        if (typeof lv !== 'undefined') {
            level = lv;
            winston.loggers.loggers.level = lv;
        } else {
            return level;
        }
    }
}

