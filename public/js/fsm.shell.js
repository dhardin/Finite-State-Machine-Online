/*
* fsm.shell.js
* Shell module for fsm
*/
/*jslint browser : true, continue : true,
devel : true, indent : 2, maxerr : 50,
newcap : true, nomen : true, plusplus : true,
regexp : true, sloppy : true, vars : false,
white : true
*/
/*global $, fsm */
fsm.shell = (function () {
    //---------------- BEGIN MODULE SCOPE VARIABLES --------------
    var
    configMap = {
        anchor_schema_map : {
        },
        main_html: String()
        + '<div class="fsm-shell-head">'
          + '<div class="fsm-shell-menu"></div>'
        + '</div>'
        + '<div class="fsm-shell-main">'
            + '<div class="fsm-shell-main-sidebar">'
                + '<div class="panel panel-primary">'
                    + '<div class="panel-heading">'
                        + '<h6>Instructions</h6>'
                    + '</div>'
                    + '<ul  class="list-group">'
                        + '<li class="list-group-item">Select Object = Click</li>'
                        + '<li class="list-group-item">Create New State = Double Click</li>'
                        + '<li class="list-group-item">Draw Transition = Shift + Left Click (Hold) <br>[release on target state to commit]</li>'
                        + '<li class="list-group-item">Delete Selected Object = Delete Key</li>'
                    + '</ul>'
                + '</div>'
                + '<div class="panel panel-primary">'
                    + '<div class="panel-heading">'
                        + '<h6>Special Character Keycodes</h6>'
                    + '</div>'
                    + '<ul  class="list-group">'
                        + '<li class="list-group-item">/lambda = &lambda;</li>'
                        + '<li class="list-group-item">/epsilon = &epsilon;</li>'
                        + '<li class="list-group-item">/delta = &delta;</li>'
                    + '</ul>'
                +'</div>'
            +'</div>'
            + '<div class="fsm-shell-main-content"></div>'
        + '</div>'
        + '<div class="fsm-shell-foot"></div>'
    },

    stateMap = {
        $container: null,
        anchor_map : {}
    },
    jqueryMap = {},
    copyAnchorMap, setJqueryMap,
    changeAnchorPart,
    initModule;
    //----------------- END MODULE SCOPE VARIABLES ---------------
    //-------------------- BEGIN UTILITY METHODS -----------------
    // Returns copy of stored anchor map; minimized overhead
    copyAnchorMap = function () {
        return $.extend(true, {}, stateMap.anchor_map);
    };
    //--------------------- END UTILITY METHODS ------------------
    //--------------------- BEGIN DOM METHODS --------------------
    // Begin DOM method /setJqueryMap/
    setJqueryMap = function () {
        var $container = stateMap.$container;
        jqueryMap = {
            $container: $container,
            $sidebar : $container.find('.fsm-shell-main-sidebar'),
            $main_content: $container.find('.fsm-shell-main-content'),
            $menu: $container.find('.fsm-shell-menu')
        };
    };
    // End DOM method /setJqueryMap/

    //Begin DOM method /changeAnchorPart/
    // Purpose : Changes part of the URI anchor component
    // Arguments:
    //      * arg_map - The map describing what part of the URI anchor
    //        we want changed.
    //  Returns : boolean
    //      * true - the Anchor portion of the URI was update
    //      * false - the Anchor portion of the URI could not be updated
    //  Action :
    //      The current anchor rep stored in stateMap.anchor_map.
    //      See uriAnchor for discussion of encoding.
    //      This method
    //          * Creates a copy of this map using copyAnchorMap().
    //          * Modifies the key-values using arg_map.
    //          * Manages the distinction between independent
    //            and dependent values in the endcoding.
    //          * Attempt to change the URI using uriAnchor
    //          * Returns true on succes, and false on failure.
    //
    changeAnchorPart = function (arg_map) {
        var
            anchor_map_revise = copyAnchorMap(),
            bool_return = true,
            key_name, key_name_dep;

        // Begin merge changes into anchor map
        KEYVAL:
        for (key_name in arg_map ){
            if ( arg_map.hasOwnProperty( key_name) ) {
                // skip dependent keys during iteration
                if (key_name.indexOf ('_') === 0) { continue KEYVAL;}

                // update independent key value
                anchor_map_revise[key_name] = arg_map[key_name];

                // update matching dependent key
                key_name_dep = "_" + key_name;
                if (arg_map[key_name_dep]){
                    anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
                }
                else {
                    delete anchor_map_revise[key_name_dep];
                    delete anchor_map_revise['_s' + key_name_dep];
                }
            }
                
        }
        // End merge changes into anchor map

        // Begin attempt to update URI; revert if not successful
        try {
            $.uriAnchor.setAnchor(anchor_map_revise);
        }
        catch (error){
            // replace URI with existing state
            $.uriAnchor.setAnchor( stateMap.anchor_map, null, true );
            bool_return = false;
        }
        // End attempt to update URI...

        return bool_return;
    };
    // End DOM method /changeAnchorPart/
    //--------------------- END DOM METHODS ----------------------
    //------------------- BEGIN EVENT HANDLERS -------------------
  
    //-------------------- END EVENT HANDLERS --------------------
    //------------------- BEGIN PUBLIC METHODS -------------------
    // Begin Public method /initModule/
    initModule = function ($container) {
        // load HTML and map jQuery collections
        stateMap.$container = $container;
        $container.html(configMap.main_html);
        setJqueryMap();
        

     

        fsm.menu.initModule(jqueryMap.$menu);
        fsm.graph.initModule(jqueryMap.$main_content);
        

    };
    // End PUBLIC method /initModule/
    return { initModule: initModule };
    //------------------- END PUBLIC METHODS ---------------------
}());