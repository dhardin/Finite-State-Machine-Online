/*
* fsm.fake.js
* Fake module
*/
/*jslint browser : true, continue : true,
devel : true, indent : 2, maxerr : 50,
newcap : true, nomen : true, plusplus : true,
regexp : true, sloppy : true, vars : false,
white : true
*/
/*global $, fsm */
fsm.fake = (function () {
    'use strict';
    var getGraphList, getPeopleList, fakeIdSerial, makeFakeId, mockSio, randomDate, graphList;

    fakeIdSerial = 2;

    makeFakeId = function () {
        return 'id_' + String(fakeIdSerial++);
    };

    randomDate = function (start, end) {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }

    graphList = [
        {
            name: 'Dustin\'s Graph', _id: 'id_1',
            owner_id: 'id_1',
            created: new Date(2013, 0, 1),
            modified: randomDate(new Date(2013, 0, 1), new Date()),
            states: [
                {
                    x: 50,
                    y: 50,
                    text: 'State 1',
                    startState: true,
                    endState: false,
                    transitions: [
                        {
                            startState: {x: 50, y: 50},
                            endState: {x:200, y:200},
                            text: '/lambda'
                        }
                    ]
                },
                {
                    x: 200,
                    y: 200,
                    text: 'State 2',
                    startState: false,
                    endState: false,
                    transitions: [
                        {
                            startState: {x: 200, y:200},
                            endState: {x: 50, y: 200},
                            text: 'Being awesome.'
                        }
                    ]

                },
                 {
                     x: 50,
                     y: 200,
                     text: 'State 3',
                     startState: false,
                     endState: true,
                     transitions: []
                 }
            ]
        }];

    getPeopleList = function () {
        return [
            {
                name: 'Dustin', _id: 'id_1',
                password: 'blah'
            },
            {
                name: 'Foo', _id: 'id_2',
                password: 'Bar'
            }
        ];
    };
    
    getGraphList = function (id) {
        var i, userGraphs=[], graphArr=[];
        if (!id) {
            return graphList;
        } else {
            //get graph list for user with id
            for (i = 0; i < getPeopleList().length; i++){
                if (getPeopleList()[i]._id == id){
                    userGraphs = getPeopleList()[i].graphs;
                }
            }
        }

        for (i = 0; i < graphList.length; i++) {
            if (userGraphs.indexOf(graphList[i]._id) == 0) {
                graphArr.push(graphList[i]);
            }
        }
        return graphArr;
        
    };

    mockSio = (function () {
        var on_sio, i = 0, users = [], user, emit_sio, callback_map = {};
        on_sio = function ( msg_type, callback ) {
            callback_map[ msg_type ] = callback;
        };
        emit_sio = function ( msg_type, data ) {
            if ( msg_type === 'adduser' && callback_map.userupdate ) {
                setTimeout( function () {
                    callback_map.userupdate(
                    [{
                        _id: makeFakeId(),
                        password: data.password,
                        name: data.name,
                        graphs: []
                    }]
                    );
                }, 1000);
            } else if (msg_type === 'updateuser' && callback_map.userupdate) {
                setTimeout(function () {
                    callback_map.userupdate(
                        [{
                            _id: data._id,
                            name: data.name,
                            graphs: data.graphs
                        }]
                    );
                });
            } else if (msg_type === 'getuser' && callback_map.userupdate) {
                //check to see if user exists in "database"
                users = getPeopleList();
                for (i = 0; i < users.length; i++) {
                    if (users[i].name == data.name && users[i].password == data.password) {
                        user = users[i];
                        setTimeout(function () {
                            callback_map.userupdate(
                                [{
                                    _id: user._id,
                                    name: user.name,
                                    graphs: user.graphs
                                }]
                            );
                        }, 1000);
                        return;
                    }
                   
                }
                setTimeout(function () {
                    callback_map.userupdate(
                               false
                    );
                }, 1000);
            } else if (msg_type === 'addgraph' && callback_map.graphupdate) {
                setTimeout( function () {
                    // add graph to user's graphs (generate id first)
                    var _id = makeFakeId();
                    graphList.push({
                        _id: _id,
                        name: data.name,
                        created: data.created,
                        modified: data.modified,
                        states: data.states
                    });
                    data.user.graphs.push(_id);
                    //now add graph to "database"
                    callback_map.graphupdate(
                        [{
                            _id: _id,
                            name: data.name,
                            created: data.created,
                            modified: data.modified,
                            states: data.states
                        }]
                    );
                }, 3000 );
            } else if (msg_type === 'updategraph' && callback_map.graphupdate) {
                //find matching graph
                for (i = 0; i < graphList.length; i++) {
                    if (graphList[i]._id == data._id) {
                        graphList[i] = data;
                        setTimeout(function () {
                            callback_map.graphupdate(
                                [{
                                    _id: data._id,
                                    name: data.name,
                                    modified: data.modified,
                                    states: data.states
                                }]
                            );
                        }, 1000);
                        return;
                    }
                    
                }
                setTimeout(function () {
                    callback_map.userupdate(
                        false
                    );
                }, 1000);
               
            } else if (msg_type === 'getgraph' && callback_map.graphupdate) {
                var i, j, graphArr = [];
                if (data.graph instanceof Array) {
                    for (j = 0; j < graphList.length; j++) {
                        for (i = 0; i < data.graph.length; i++) {
                            if (graphList[j]._id === data.graph[i].id) {
                                graphArr.push(graphList[j]);
                                if (i == (data.graph.length - 1)) {
                                    setTimeout(function () {
                                        callback_map.graphupdate(graphArr);
                                    }, 1000);
                                    return;
                                }
                            }
                        }
                    }
                    setTimeout(function () {
                        callback_map.graphupdate(false);
                    }, 1000);
                } else {
                    for (i = 0; i < graphList.length; i++) {
                        if (graphList[i]._id === data.id) {
                            
                            setTimeout(function () {
                                callback_map.graphupdate(
                                    [graphList[i]]
                                );
                            }, 1000);
                            return;
                        }
                    }
                }
            }
        };
        return { emit: emit_sio, on: on_sio };
    }());

    return {
        getGraphList: getGraphList,
        getPeopleList: getPeopleList,
        mockSio : mockSio
    };
}());