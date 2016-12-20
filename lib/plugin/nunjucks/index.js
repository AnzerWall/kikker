/**
 * Created by anzer on 2016/12/20.
 */
/**
 * Created by anzer on 2016/11/8.
 */
let nunjucks = require('nunjucks');

class NunjucksPlugin {
    static getName() {
        return 'Nunjucks';
    }

    init(app) {
        nunjucks.configure(app.VIEW_PATH);
        app.contextWrapper((ctx) => {
            ctx.render = function (view = 'index.nunj', data = {}) {
                ctx.body = nunjucks.render(view, data);
                ctx.status = 200;
                ctx.response.type = "text/html";
            };
        }, 'nunjucks');

    }
}
module.exports = NunjucksPlugin;
