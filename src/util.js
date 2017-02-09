'use strict';
/**
 * Created by anzer on 2017/1/20.
 */
let _ = require('lodash');
_.pascalCase = (str) => _.chain(str).words().map(_.upperFirst).join('').value();
_.format = require('util').format;
module.exports = _;