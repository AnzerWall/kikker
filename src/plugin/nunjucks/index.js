"use strict";
/**
 * Created by anzer on 2016/11/8.
 */
let nunjucks = require('nunjucks');
class ViewEngine {
    view(viewName, data) {
        return nunjucks.render(viewName, data);
    }
}
module.exports = function (app) {
    return {
        install(app){
            nunjucks.configure(app.VIEW_PATH);
            app.viewEngine('nunjucks', ViewEngine);
        }
    }
}

