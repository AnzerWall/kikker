'use strict';

/**
 * Created by anzer on 2017/1/20.
 */
module.exports = {
    enable: true,
    options: {
        enableTypes: ['json', 'form', 'text'],
        extendTypes: {
            text: ['text/xml']
        },
        onerror: function (err, ctx) {
            ctx.status = 200;
            ctx.type = "application/json";
            ctx.body = ctx.app.makeFailMessage(err, -422)

        },
    }
}