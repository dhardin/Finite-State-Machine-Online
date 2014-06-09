/*
* fsm.model.js
* Model module
*/
/*jslint browser : true, continue : true,
devel : true, indent : 2, maxerr : 50,
newcap : true, nomen : true, plusplus : true,
regexp : true, sloppy : true, vars : false,
white : true
*/
/*global, $, fsm */
fsm.model = (function () {
    'use strict';
    var
    configMap = { anon_id: 'a0' },
    stateMap = {
        user: null,
        graph: null,
        anon_user: null,
        cid_serial: 0,
        people_cid_map: {},
        graphs_cid_map: {},
        people_db: TAFFY(),
        graph_db: []
    },
isFakeData = false,
personProto, makePerson, removePerson,people,
graphProto, makeGraph, removeGraph, graphs, 
makeCid, clearGraphDb, completeLogin, completeSave, updateGraphDb, updateUser, initModule;

    // Person
    personProto = {
        get_is_user : function () {
            return this.cid === stateMap.user.cid;
        },
        get_is_anon : function () {
            return this.cid === stateMap.anon_user.cid;
        }
    };
    makeCid = function () {
        return 'c' + String(stateMap.cid_serial++);
    };
   
    completeLogin = function (user) {
        if (!user || user[0].length == 0) {
            $.gevent.publish('fsm-login', { user: false });
            return;
        }
        var user_map = user[0],
            graph_list, graph_map, i;
        delete stateMap.people_cid_map[user_map.cid];
        stateMap.user = {};
        stateMap.user.name = user_map.name;
        stateMap.user.password = user_map.password;
        stateMap.user.id = user_map._id;
        $.gevent.publish('fsm-login', { user: stateMap.user });
    };

    updateUser = function (user) {
        var user_map = user, i;
        delete stateMap.people_cid_map[user_map.cid];
        stateMap.user.cid = user_map._id;
        stateMap.user.id = user_map._id;
        stateMap.people_cid_map[user_map._id] = stateMap.user;
    };

    completeSave = function (graph) {
        $.gevent.publish('fsm-graph-saved', {});
    };

    updateGraphDb = function (graphs) {
        var i;
        clearGraphDb();
        stateMap.graph_db = graphs[0];

        $.gevent.publish('fsm-graphs-fetched', {graphs: stateMap.graph_db});
    };

    makePerson = function ( person_map ) {
        var person,
        password = person_map.password,
        id = person_map.id,
        name = person_map.name;
        person = Object.create( personProto );
        person.name = name;
        person.password = password;
        if ( id ) { person.id = id; }
        stateMap.people_db.insert( person );
        return person;
    };
    removePerson = function ( person ) {
        if ( ! person ) { return false; }
        // can't remove anonymous person
        if ( person.id === configMap.anon_id ) {
            return false;
        }
        stateMap.user = {};
        return true;
    };
    people = (function () {
        var get_by_cid, get_db, get_user, login, logout, graph_list, graph_map;

        get_by_cid = function ( cid ) {
            return stateMap.people_cid_map[ cid ];
        };

        get_db = function () { return stateMap.people_db; };

        get_user = function () { return stateMap.user; };

        login = function (name, password) {
            if (!name || !password) {
                completeLogin(false);
            }
            var sio = isFakeData ? fsm.fake.mockSio : fsm.data.getSio();
          
            sio.on('userupdate', completeLogin);
          
            sio.emit('login', {
                name : name,
                password: password
            });
        };

        logout = function () {
            var is_removed, user = stateMap.user;

            is_removed = removePerson( user );
            stateMap.user = stateMap.anon_user;
            $.gevent.publish( 'fsm-logout', { user: user } );
            return is_removed;
        };

        return {
            get_by_cid: get_by_cid,
            get_db: get_db,
            get_user: get_user,
            login: login,
            logout: logout
        };
    }());

    // Graph
    graphProto = {
        get_is_graph: function () {
            return this.cid === stateMap.graph.cid;
        }
    };

    clearGraphDb = function () {
        stateMap.graph_db = [];
    };

    makeGraph = function (graph_map) {
        var graph,
        user_id= graph_map.user_id,
        id = graph_map.id,
        name = graph_map.name,
        created = graph_map.created,
        modified = graph_map.modified,
        states = graph_map.states;

        graph = Object.create(graphProto);
        graph.user_id = user_id;
        graph.name = name;
        graph.created = created;
        graph.modified = modified;
        graph.states = states;

        if (id) {
            graph.id = id;
        }

        stateMap.graph_db.push(graph);

        return graph;
    };

    graphs = (function () {
        var get_by_cid, get_db, get_graph, get_graphs, graph_list, graph_map, save;

         get_by_cid = function ( cid ) {
             return stateMap.graphs_cid_map[cid];
         };

         get_db = function () {
             return stateMap.graphs_db;
         };

         get_graph = function () {
             return stateMap.graph;
         };

         
         get_graphs = function (user_map) {
             var sio = isFakeData ? fsm.fake.mockSio : fsm.data.getSio();

             sio.on('graphreceived', updateGraphDb);
             sio.emit('getgraph', { user_id: user_map.id });
         }

         save = function (id, name, states, isNewGraph) {
             if (!isNewGraph) {
                 stateMap.graph.id = id;
             }

             var statesArr = [], state = {}, i, j,
                 sio = isFakeData ? fsm.fake.mockSio : fsm.data.getSio();

             for (i = 0; i < states.length; i++) {
                 state = {};
                 state.x = states[i].x;
                 state.y = states[i].y;
                 state.text = states[i].text || "";
                 state.startState = states[i].startState;
                 state.endState = states[i].endState;
                 state.transitions = [];
                 for (j = 0; j < states[i].transitions.length; j++) {
                     state.transitions.push({
                         startState: {
                             x: states[i].transitions[j].startState.x,
                             y: states[i].transitions[j].startState.y
                         },
                         endState: {
                             x: states[i].transitions[j].endState.x,
                             y: states[i].transitions[j].endState.y
                         },
                         text: states[i].transitions[j].text || ""
                     });
                 }

                 statesArr.push(state);
             }

             //make our graph object
             sio.on('graphupdate', completeSave);
            
             if (isNewGraph) {
                 stateMap.graph = makeGraph({
                     user_id: stateMap.user.id,
                     name: name,
                     created: new Date(),
                     modified: new Date(),
                     states: statesArr
                 });
                 sio.emit('addgraph', {
                     user_id: stateMap.user.id,
                     name: name,
                     created: new Date(),
                     modified: new Date(),
                     states: statesArr
                 });
             } else {
                 sio.emit('updategraph', {
                     _id: id,
                     user_id: stateMap.user.id,
                     name: name,
                     modified: new Date(),
                     states: statesArr
                 });
             }
            
           
             return;
         };
        
         return {
             get_by_cid: get_by_cid,
             get_db: get_db,
             get_graph: get_graph,
             get_graphs: get_graphs,
             save: save
         };
     }());

    initModule = function () {
        var i, people_list, person_map;
        // initialize anonymous person
        stateMap.anon_user = makePerson({
            cid : configMap.anon_id,
            id : configMap.anon_id,
            name: 'anonymous'
        });
        stateMap.user = stateMap.anon_user;
        if ( isFakeData ) {
            people_list = fsm.fake.getPeopleList();
            for (i = 0; i < people_list.length; i++) {
                person_map = people_list[i];
                makePerson({
                    cid: person_map._id,
                    password: person_map.password,
                    id: person_map._id,
                    name: person_map.name
                });
            }
        }

        $.gevent.subscribe($('<div/>'), 'fsm-load-complete', function (e, update_map) {
            stateMap.graph = stateMap.graph ? stateMap.graph : {};
            stateMap.graph.states = update_map.states;
            stateMap.graph.name = update_map.name;
        });
    };

    return {
        initModule: initModule,
        people: people,
        graphs:graphs
    };
}());