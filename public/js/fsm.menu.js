/*
* fsm.menu.js
* Menu module for fsm
*/
/*jslint browser : true, continue : true,
devel : true, indent : 2, maxerr : 50,
newcap : true, nomen : true, plusplus : true,
regexp : true, sloppy : true, vars : false,
white : true
*/
/*global $, fsm */
fsm.menu = (function () {
    //---------------- BEGIN MODULE SCOPE VARIABLES --------------
    var
    configMap = {
        anchor_schema_map: {
        },
        main_html : String()
           + '<nav class="navbar navbar-default" role="navigation">'
            + '<div class="container-fluid">'
                + '<div class="navbar-header">'
                    + '<button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1">'
                        + '<span class="sr-only">Toggle navigation</span>'
                        + '<span class="icon-bar"></span>'
                        + '<span class="icon-bar"></span>'
                        + '<span class="icon-bar"></span>'
                    + '</button>'
                    + '<a class="navbar-brand" href="#">Finite State Machine</a>'
                + '</div>'
                + '<div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">'
                    + '<ul class="nav navbar-nav">'
                        + '<li class="dropdown">'
                            + '<a href="#" class="dropdown-toggle" data-toggle="dropdown">Actions<b class="caret"></b></a>'
                            + '<ul class="dropdown-menu">'
                                + '<li><a class="new glyphicon glyphicon-file" href="#"> New</a></li>'
                                + '<li><a class="print glyphicon glyphicon-print" href="#print"> Print</a></li>'
                                + '<li class="disabled user-option"><a class="save glyphicon glyphicon-floppy-disk" href="#"> Save</a></li>'
                                + '<li class="disabled user-option"><a class="load glyphicon glyphicon-folder-open" href="#"> Load</a></li>'
                            + '</ul>'
                        + '</li>'
                    + '</ul>'
                    + '<ul class="nav navbar-nav navbar-right">'
                        + '<li class="dropdown">'
                            + '<a href="#" class="dropdown-toggle" data-toggle="dropdown"><span class="glyphicon glyphicon-user"></span><span class="user" style="padding-left:10px;">Guest</span><b class="caret"></b></a>'
                            + '<ul class="dropdown-menu">'
                                + '<li><a class="sign-in glyphicon glyphicon-circle-arrow-right" href="#" style="color:green; padding-left: 10px;">Sign-In</a></li>'
                                + '<li><a class="account glyphicon glyphicon-cog" href="#" style="display:none; padding-left: 10px;">Account</a></li>'
                                + '<li class="divider"></li>'
                                + '<li><a class="sign-out glyphicon glyphicon-circle-arrow-left" href="#" style="display:none;color:red; padding-left:10px;">Sign-Out</a></li>'
                            + '</ul>'
                        + '</li>'
                    + '</ul>'
                + '</div>'
            + '</div>'
          + '</nav>',

        sign_in_html: String()
            + '<div id="sign-in-modal" class="modal fade">'
                + '<div class="modal-dialog">'
                    + '<div class="modal-content">'
                        + '<div class="modal-header">'
                            + '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'
                            + '<h4 class="modal-title">Finite State Machine</h4>'
                        + '</div>'
                        
                        + '<div class="modal-body">'
                            + '<form role="form">'
                                + '<div class="form-group">'
                                    + '<input  id="sign-in-username" type="text" class="form-control" placeholder="Username">'
                                + '</div>'
                                + '<div class="form-group">'
                                    + '<input  id="sign-in-password" type="password" class="form-control" placeholder="Password">'
                                + '</div>'
                            + '</form>'
                        + '</div>'
                        + '<div class="modal-footer">'
                            + '<button type="button" class="close-modal-btn btn btn-default" data-dismiss="modal">Close</button>'
                            + '<button type="button" id="sign-in-user-btn" class="btn btn-primary">Sign-In</button>'
                        + '</div>'
                    + '</div><!-- /.modal-content -->'
                + '</div><!-- /.modal-dialog -->'
            + '</div><!-- /.modal -->',

        load_html: String()
            + '<div id="load-modal" class="modal fade">'
                + '<div class="modal-dialog">'
                    + '<div class="modal-content">'
                        + '<div class="modal-header">'
                            + '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'
                            + '<h4 class="modal-title">Finite State Machine</h4>'
                        + '</div>'
                        + '<div class="modal-body">'
                            + '<div class="graph-list list-group">'
                             
                            + '</div>'
                        + '</div>'
                        + '<div class="modal-footer">'
                            + '<button type="button" class="close-modal-btn btn btn-default" data-dismiss="modal">Close</button>'
                            + '<button type="button" id="load-graph-btn" class="btn btn-primary">Load</button>'
                        + '</div>'
                    + '</div><!-- /.modal-content -->'
                + '</div><!-- /.modal-dialog -->'
            + '</div><!-- /.modal -->',

        save_html: String()
         + '<div id="save-modal" class="modal fade">'
                + '<div class="modal-dialog">'
                    + '<div class="modal-content">'
                        + '<div class="modal-header">'
                            + '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'
                            + '<h4 class="modal-title">Finite State Machine</h4>'
                        + '</div>'

                        + '<div class="modal-body">'
                            + '<form role="form">'
                                + '<div class="form-group">'
                                    + '<input  id="save-graph-name" type="text" class="form-control" placeholder="Graph Name">'
                                + '</div>'
                            + '</form>'
                        + '</div>'
                        + '<div class="modal-footer">'
                            + '<button type="button" class="close-modal-btn btn btn-default" data-dismiss="modal">Close</button>'
                            + '<button type="button" id="save-graph-btn" class="btn btn-primary">Save</button>'
                        + '</div>'
                    + '</div><!-- /.modal-content -->'
                + '</div><!-- /.modal-dialog -->'
            + '</div><!-- /.modal -->'
    },
    stateMap = {
        $container: null,
        anchor_map: {},
        loadGraph: {},
        isNew: true
    },
    jqueryMap = {},
    copyAnchorMap, setJqueryMap,
    onNewClick, onPrintClick, onLoadClick, onSaveClick, onAccountClick, onSignInClick, onSignOutClick, onLogin, onLogout, onLoad, onGraphsLoaded,
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
            $new: $container.find('.new'),
            $print: $container.find('.print'),
            $save: $container.find('.save'),
            $load: $container.find('.load'),
            $acct: $container.find('.account'),
            $signIn: $container.find('.sign-in'),
            $signOut: $container.find('.sign-out'),
            $user: $container.find('.user')
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
            for (key_name in arg_map) {
                if (arg_map.hasOwnProperty(key_name)) {
                    // skip dependent keys during iteration
                    if (key_name.indexOf('_') === 0) { continue KEYVAL; }

                    // update independent key value
                    anchor_map_revise[key_name] = arg_map[key_name];

                    // update matching dependent key
                    key_name_dep = "_" + key_name;
                    if (arg_map[key_name_dep]) {
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
        catch (error) {
            // replace URI with existing state
            $.uriAnchor.setAnchor(stateMap.anchor_map, null, true);
            bool_return = false;
        }
        // End attempt to update URI...

        return bool_return;
    };
    // End DOM method /changeAnchorPart/

    //--------------------- END DOM METHODS ----------------------

    //------------------- BEGIN EVENT HANDLERS -------------------
    // Begin Event Handler /onSignInClick/
    onSignInClick = function (e) {
        $(configMap.sign_in_html).appendTo('body').modal();
    };
    // End Event Handler /onSignInClick/

    // Begin Event Handler /onLogin/
    onLogin = function (e, update_map) {
        if (!update_map.user) {
            $("#sign-in-user-btn")
                .html('invalid login')
                .removeClass('btn-primary')
                .addClass('btn-danger');

            setTimeout(function () {
                $("#sign-in-user-btn")
                    .html('Sign In')
                .removeClass('btn-danger')
                .addClass('btn-primary');
            }, 2000);

        } else {
            $(this).text(update_map.user.name);
            jqueryMap.$signIn.hide();
            jqueryMap.$signOut.show();
            jqueryMap.$acct.show();
            jqueryMap.$container.find('.user-option').removeClass("disabled");
            $("#sign-in-modal").modal('hide');
        }
    }
    // End Event Handler /onLogin/

    // Begin event handler /onLogout/
    onLogout = function (e) {
        jqueryMap.$container.find('.user-option').addClass("disabled");
    };
    // End event handler /onLogout/

    // Begin Event Handler /onSignOutClick/
    onSignOutClick = function (e) {
        fsm.model.people.logout();
        jqueryMap.$user.text(" Guest");
        jqueryMap.$signOut.hide();
        jqueryMap.$signIn.show();
        jqueryMap.$acct.hide();
        jqueryMap.$
    };
    // End Event Handler /onSignOutClick/

    // Begin Event Handler /onLoadClick/
    onLoadClick = function (e) {
        var $graphList, graphListHtml, i;

        fsm.model.graphs.get_graphs({ id: fsm.model.people.get_user().id });

        $(configMap.load_html).appendTo('body').modal();
        $graphList = $("#load-modal").find('.graph-list');

        $('<a href="#" class="list-group-item active">Graphs</a>'
            + '<a href="#" class="graph-list-item list-group-item">'
                + '<span class="glyphicon glyphicon-refresh spinner"></span><span style="padding-left: 5px;">Fetching graphs...</span>'
            + '</a>').appendTo($graphList);
    };
    // End Event Handler /onLoadClick/

    // Begin Event handler /onGraphsLoaded/
    onGraphsLoaded = function (e, graph_map) {
        var $graphList = $("#load-modal").find('.graph-list'),
            graphs = graph_map.graphs;

        $graphList.empty();

        $('<a href="#" class="list-group-item active">Graphs</a>').appendTo($graphList);
        if (graphs.length == 0) {
            $('<a href="#" class="graph-list-item list-group-item">Shoot.  You don\'t have any graphs!  You should probably go make some :)</a>')
                 .appendTo($graphList);
        } else {
            for (i = 0; i < graphs.length; i++) {
                $('<a href="#" class="graph-list-item list-group-item">' + graphs[i].name
                    + '<span class="badge">' + graphs[i].modified + '</span></a>')
                    .data('graph', graphs[i])
                    .appendTo($graphList);
            }
        }
    };
    // End Event handler /onGraphsLoaded/

    // Begin Event Handler /onSaveClick/
    onSaveClick = function (e) {
        $(configMap.save_html).appendTo('body').modal();
    }
    // End Event Handler /onSaveClick/

    // Begin Event Handler /onNewClick/
    onNewClick = function (e) {
        $.gevent.publish('fsm-new', {});
        stateMap.isNew = true;
    };
    // End Event Handler /onNewClick/

    // Begin Event Handler /onPrintClick/
    onPrintClick = function (e) {
        $.gevent.publish('fsm-print', {});
    };
    // End Event Handelr /onPrintClick/

    //-------------------- END EVENT HANDLERS --------------------
    //------------------- BEGIN PUBLIC METHODS -------------------
    // Begin Public method /initModule/
    initModule = function ($container) {
        // load HTML and map jQuery collections
        stateMap.$container = $container;
        $container.html(configMap.main_html);
        setJqueryMap();
        
        // initialize event handling
        jqueryMap.$new.on('click', onNewClick);
        jqueryMap.$print.on('click', onPrintClick);
        jqueryMap.$load.on('click', onLoadClick);
        jqueryMap.$save.on('click', onSaveClick);
        jqueryMap.$acct.on('click', onAccountClick);
        jqueryMap.$signIn.on('click', onSignInClick);
        jqueryMap.$signOut.on('click', onSignOutClick);

        $.gevent.subscribe(jqueryMap.$user, 'fsm-login', onLogin);
        $.gevent.subscribe(jqueryMap.$container, 'fsm-logout', onLogout);
        $.gevent.subscribe($('<div/>'), 'fsm-load-complete', function (e) {
            stateMap.isNew = false;
            $('#load-modal').remove();
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
        });
        $.gevent.subscribe($('<div/>'), 'fsm-graph-saved', function (e) {
            stateMap.isNew = false;
            $('#save-modal').remove();
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
        });
        $.gevent.subscribe($('<div/>'), 'fsm-graphs-fetched', onGraphsLoaded);


        $(document).on('click', '#sign-in-user-btn', function (e) {
            var username = $('#sign-in-username').val(),
                password = $('#sign-in-password').val();
            $(this).html('<span class="glyphicon glyphicon-refresh spinner"></span><span style="padding-left: 5px;">Signing in...</span>');

            //login user
            fsm.model.people.login(username, password);
        });

        $(document).on('click', '#load-graph-btn', function (e) {
            $(this).html('<span class="glyphicon glyphicon-refresh spinner"></span><span style="padding-left: 5px;">Loading graphs...</span>');
            
            //publish load event
            $.gevent.publish('fsm-load', { graph: stateMap.loadGraph });
        });

        $(document).on('click', '#save-graph-btn', function (e) {
            var name = $('#save-graph-name').val();
            $(this).html('<span class="glyphicon glyphicon-refresh spinner"></span><span style="padding-left: 5px;">Saving graph...</span>');

            //save graph
            fsm.model.graphs.save(stateMap.loadGraph._id, name, fsm.graph.getStates(), stateMap.isNew);
        });

        $(document).on('click', '.graph-list-item', function (e) {
            $(this).parent().find('.load-active-item').removeClass('load-active-item');
            $(this).addClass('load-active-item');
            stateMap.loadGraph = $(this).data('graph');
        });

        $(document).on('hidden.bs.modal', "#sign-in-modal", function (e) {
            $('#sign-in-modal').remove();
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
        });

        $(document).on('hidden.bs.modal', '#load-modal', function (e) {
            $('#load-modal').remove();
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
        });

        $(document).on('hidden.bs.modal', "#save-modal", function (e) {
            $('#save-modal').remove();
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
        });

    };
    // End PUBLIC method /initModule/
    return {
        initModule: initModule
    };
    //------------------- END PUBLIC METHODS ---------------------
}());