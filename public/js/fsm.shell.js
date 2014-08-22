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
                + '</div>'
                  + '<div class="panel panel-primary">'
                    + '<div class="panel-heading">'
                        + '<h6>Navigation Map</h6>'
                    + '</div>'
                    + '<div class="fsm-nav-map-controls">'
                        + '<button type="button" class="btn btn-default btn-xs fsm-graph-nav-zoom-in">'
                            + '<span class="glyphicon glyphicon-plus"></span>'
                        + '</button>'
                        + '<button type="button" class="btn btn-default btn-xs fsm-graph-nav-zoom-out">'
                            + '<span class="glyphicon glyphicon-minus"></span>'
                        + '</button>'
                    + '</div>'
                    + '<div class="fsm-nav-map"><img class="fsm-graph-image"/><div class="draggable"></div><div class="drag-clone"></div></div>'
                + '</div>'
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
    copyAnchorMap, setJqueryMap, updateNavMap,
    changeAnchorPart, onNavMove, onNavClick, onGraphUpdate, onZoomIn, onZoomOut, onZoom, onGraphResize,
    onGraphScroll,
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
            $menu: $container.find('.fsm-shell-menu'),
            $nav_drag: $container.find('.draggable'),
            $nav_drag_clone: $container.find('.drag-clone'),
            $nav_container: $container.find('.fsm-nav-map'),
            $nav_image: $container.find('.fsm-graph-image'),
            $nav_controls: $container.find('.fsm-graph-nav-map-controls'),
            $zoomIn: $container.find('.fsm-graph-nav-zoom-in'),
            $zoomOut: $container.find('.fsm-graph-nav-zoom-out')
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
    
    updateNavMap = function (update_map) {
       
    };

    bindNav = function () {
        var $nav_container = jqueryMap.$nav_container,
           $nav_drag =jqueryMap.$nav_drag,
           nav_drag_position = { left: parseInt($nav_drag.css('left'), 10), top: parseInt($nav_drag.css('top'), 10) },
           nav_container_position = $nav_container.position();

        //bind nav drag to container
        if (nav_drag_position.left < 0) {
            $nav_drag.css('left', '0px');

            // e.preventDefault();
        }
        if (nav_drag_position.top < 0) {
            $nav_drag.css('top', '0px');

            //  e.preventDefault();
        }
        if (nav_drag_position.top + $nav_drag.height() > $nav_container.height()) {
            $nav_drag.css('top', ($nav_container.height() - $nav_drag.height()) + 'px');

            //  e.preventDefault();
        }
        if (nav_drag_position.left + $nav_drag.width() > $nav_container.width()) {
            $nav_drag.css('left', ($nav_container.width() - $nav_drag.width()) + 'px');

            //  e.preventDefault();
        }
    }
    //--------------------- END DOM METHODS ----------------------
    //------------------- BEGIN EVENT HANDLERS -------------------
    onNavClick = function (e) {
        var mousePos = {
            left: e.pageX - $(this).offset().left,
            top: e.pageY - $(this).offset().top
        },
        nav_center_offset = { left: jqueryMap.$nav_drag.width() * 0.5, top: jqueryMap.$nav_drag.height() * 0.5 };
        
        jqueryMap.$nav_drag.css({ left: (mousePos.left - nav_center_offset.left) + 'px', top: (mousePos.top - nav_center_offset.top) + 'px' });


        bindNav();
        onNavMove(e);


    }
    onNavMove = function (e) {
        e.stopPropagation();
        var $nav_drag =jqueryMap.$nav_drag,
            $nav_container = jqueryMap.$nav_container,
            nav_drag_position = { left: (parseInt($nav_drag.css('left'), 10) ) / $nav_container.width(), top: (parseInt($nav_drag.css('top'), 10) ) / $nav_container.height() };

        $.gevent.publish('fsm-nav-move', { x: nav_drag_position.left, y: nav_drag_position.top });
    };

    onGraphUpdate = function (e, update_map) {
       // var img = update_map.img;

        jqueryMap.$nav_image.attr('src', update_map.img);
        jqueryMap.$nav_image.width(jqueryMap.$nav_container.css('width'));
        jqueryMap.$nav_image.height(jqueryMap.$nav_container.css('height'));
    };

    // begin event handler /onZoomIn/
    onZoomIn = function (e) {
        
        $.gevent.publish('fsm-zoom-in', {});
    };
    // end event handler /onZoomIn/

    // begin event handler /onZoomOut/
    onZoomOut = function (e) {
   
        $.gevent.publish('fsm-zoom-out', {});
    };
    // end event handler /onZoomOut/

    // begin event handler /onZoom/
    onZoom = function (e, update_map) {
        var zoomLevel = update_map.zoom;
        jqueryMap.$nav_drag.css({
            width: jqueryMap.$nav_container.width() / zoomLevel,
            height: jqueryMap.$nav_container.height() / zoomLevel
        });
        bindNav();
  
    }
    // end event handler /onZoom/

    // begin event handler /onGraphResize/
    onGraphResize = function (e, update_map) {
        var width_percent = update_map.width,
            height_percent = update_map.height;

        jqueryMap.$nav_drag.css({
            width: width_percent < 1 ? jqueryMap.$nav_container.width() * width_percent : jqueryMap.$nav_drag.width(),
            height: height_percent < 1 ? jqueryMap.$nav_container.height() * height_percent : jqueryMap.$nav_drag.height()
        });
        bindNav();
    };
    // end event handerl /onGraphResize/

    // begin event handler /onGraphScroll/
    onGraphScroll = function(e, update_map){
        var top_percent = update_map.top_percent,
            left_percent = update_map.left_percent;

        jqueryMap.$nav_drag.css({
            left: (left_percent * jqueryMap.$nav_container.width()) + 'px',
            top: (top_percent * jqueryMap.$nav_container.height()) + 'px'
        });

        bindNav();

    };
    // end event handler /onGraphScroll/
    //-------------------- END EVENT HANDLERS --------------------
    //------------------- BEGIN PUBLIC METHODS -------------------
    // Begin Public method /initModule/
    initModule = function ($container) {
        // load HTML and map jQuery collections
        stateMap.$container = $container;
        $container.html(configMap.main_html);
        setJqueryMap();
        jqueryMap.$nav_drag.draggable({ containment: "parent" });
        fsm.menu.initModule(jqueryMap.$menu);
        fsm.graph.initModule(jqueryMap.$main_content);
        
        
      
        //jqueryMap.$nav_drag
        //    .on('drag', onNavMove)
        //    .on('dragstop', onNavMove);
        jqueryMap.$nav_container.on('mousedown', onNavClick);
        jqueryMap.$zoomIn.on('click', onZoomIn);
        jqueryMap.$zoomOut.on('click', onZoomOut);
        jqueryMap.$nav_drag.on('drag', onNavMove);

        $.gevent.subscribe($('<div/>'), 'fsm-graph-updated', onGraphUpdate);
        $.gevent.subscribe($('<div/>'), 'fsm-zoom', onZoom);
        $.gevent.subscribe($('<div/>'), 'fsm-graph-resize', onGraphResize);
        $.gevent.subscribe($('<div/>'), 'fsm-graph-scroll', onGraphScroll);
    };
    // End PUBLIC method /initModule/
    return { initModule: initModule };
    //------------------- END PUBLIC METHODS ---------------------
}());