'use strict';
/**
 * Created by anzer on 2017/1/19.
 */
global.Promise = require('bluebird');

let Application = require('./application');
Application.Loader = require('./loader');
Application.loggers = require('./logger');
module.exports = Application;