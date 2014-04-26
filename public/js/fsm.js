/*
 * fsm.js
 * Root namefsmce module
*/

/*jslint          browser : true,     continue : true,
  devel   : true,  indent : 2,        maxerr   : 50,
  newcapp : true,   nomen : true,     plusplus : true,
  regexp  : true,  sloppy : true,         vars : false,
  white   : true
*/
/*global $, fsm */

var fsm = (function () {
    var initModule = function ($container) {
        fsm.model.initModule();
        //fsm.data.initModule();
        fsm.shell.initModule($container);
    };
    return { initModule: initModule };
}());