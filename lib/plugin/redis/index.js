/**
 * Created by anzer on 2016/12/19.
 */

let Redis = require('ioredis');
let _ = require('lodash');
let moment = require('moment');
class RedisPlugin {
    init(app) {
        let logger = app.logger;
        let table = {};
        let defaultConfig = {
            host: "127.0.0.1",
            port: 6379,
            options: {}
        };
        let redisConfig = app.config('redis');
        app.contextWrapper((ctx) => {
            ctx.redis = function (key = 'default') {
                if (table[key]) {
                    return table[key];
                }
                if (redisConfig.hasOwnProperty(key) || key == 'default') {
                    let config = _.extend(defaultConfig, redisConfig[key] || {});
                    let options = _.cloneDeep(config.options);
                    options.host = config.host;
                    options.port = config.port;
                    let redis = new Redis(options);
                    redis.on('error', (e) => {
                        logger.error('Redis:' + e.stack);
                    });
                    redis.on('connect', (e) => {
                        logger.info("Redis:已连接");
                    });
                    redis.on('reconnecting', (e) => {
                        logger.info("Redis:正在重新连接...");
                    });
                    return table[key] = redis;

                } else {
                    logger.warn(`Redis:无法找到配置信息'${key}'`);
                    return null;
                }
            }
        }, 'redis');
    }

    static getName() {
        return 'Redis';
    }

}
module.exports = RedisPlugin;