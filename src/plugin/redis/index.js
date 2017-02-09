"use strict";
/**
 * Created by anzer on 2016/12/19.
 */

let Redis = require('ioredis');
let util = require('../../util');
let moment = require('moment');

function redis(name = "default") {
    if (this.app.redisInstances[name]) {
        return this.app.redisInstances[name];
    }
    const logger = this.app.getLogger('redis');
    const redisConfig = this.config('redis');
    if (redisConfig[name]) {
        let redis = new Redis(redisConfig[name]);
        redis.on('error', (e) => {
            logger.error(`${name}:${e.stack || e.message}`);
        });
        redis.on('connect', () => {
            logger.info(`${name}:已连接`);
        });
        redis.on('reconnecting', () => {
            logger.info(`${name}:正在重新连接...`);
        });
        return this.app.redisInstances[name] = redis;
    }
    return null;
}
module.exports = function (app) {
    return {
        config: {
            redis: {
                default: {
                    host: "127.0.0.1",
                    port: 6379
                }
            }
        },
        install(app){
            let controllers = app.controllers;
            let services = app.services;

            app.redisInstances = [];

            for (let key in controllers) {
                const Controller = controllers[key];
                Controller.prototype.redis = redis;

            }
            for (let key in services) {
                const Service = services[key];
                Service.prototype.redis = redis;

            }
        }
    }
};