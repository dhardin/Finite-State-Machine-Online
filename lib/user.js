/*
* user.js - module to provide user login and saving operations
*/
/*jslint node : true, continue : true,
devel : true, indent : 2, maxerr : 50,
newcap : true, nomen : true, plusplus : true,
regexp : true, sloppy : true, vars : false,
white : true
*/
/*global */
// ------------ BEGIN MODULE SCOPE VARIABLES --------------
'use strict';
var
emitUserList, signIn, signOut, userObj,
socket = require('socket.io'),
crud = require('./crud'),
makeMongoId = crud.makeMongoId;
// ------------- END MODULE SCOPE VARIABLES ---------------
// ---------------- BEGIN UTILITY METHODS -----------------
// emitUserList - broadcast user list to all connected clients
//
emitUserList = function (io) {
    crud.read(
        'user',
        { is_online: true },
        function (result_list) {
            io
                .of('/user')
                .emit('listchange', result_list);
        }
    );
};

// signIn 
//
signIn = function (io, user_map, socket) {
     console.log('signing in...');
    socket.user_id = user_map._id;
}

// signOut 
//
signOut = function (io, user_id) {
};
// ---------------- END UTILITY METHODS -----------------
// ---------------- BEGIN PUBLIC METHODS ------------------
userObj = {
    connect: function (server) {
        var io = socket.listen(server);
        // Begin io setup
        io
        .set('blacklist', [])
        .of('/user')
        .on('connection', function (socket) {
            // Begin /adduser/ message handler
            // Summary : Provides user registration capability.
            // Arguments : A single user_map object.
            // user_map should have the following properties:
            // name = the name of the user
            // password = the password of the user
            // Action :
            // If a user with the provided username already exists
            // in Mongo, emit user exists.
            // If a user with the provided username does not exist
            // in Mongo, create one and use it.
            // Send a 'userupdate' message to the sender so that
            // a login cycle can complete. 
            //
            socket.on('adduser', function (user_map) {
                crud.read(
                    'user',
                    { name: user_map.name },
                    function (result_list) {
                        var result_map;
                        
                        delete user_map.cid;

                        // use existing user with provided name
                        if (result_list.length > 0) {
                            result_map = result_list[0];
                            signIn(io, result_map, socket);
                        }

                        // create user with new name
                        else {
                          //  user_map.is_online = true;
                            crud.construct(
                                'user',
                                user_map,
                                function (result_list) {
                                    result_map = result_list[0];
                                    socket.user_id = result_map._id;
                                    socket.emit('userupdate', result_map);
                                    emitUserList(io);
                                }
                            );
                        }
                    }
                );
            });
            // End /adduser/ message handler

            // Begin /login/ message handler
            socket.on('login', function (user_map) {
                crud.read(
                    'user',
                    {
                        name: user_map.name,
                        password: user_map.password
                    },
                     function (result_list) {
                         var
                          result_map;
                         
                        if (result_list != null && result_list.length > 0) {
                            result_map = result_list[0];
                            signIn(io, result_map, socket);
                        } else {
                            result_map = [];
                        }
                        socket.emit('userupdate', result_map);
                     }
                );
            });
            // End /login/ message handler

            // Begin /logout/ message handler
            socket.on('logout', function () {
                console.log(
                '** user %s logged out **', socket.user_id
                );
                signOut(io, socket.user_id);
            });
            // End /logout/ message handler

            // Begin /disconnect/ message handler
            socket.on('disconnect', function () {
                console.log(
                '** user %s closed browser window or tab **',
                socket.user_id
                ); signOut(io, socket.user_id);
            });
            // End /disconnect/ message handler

            // Begin /updateuser/ message handler
            socket.on('updateuser',  function (user_map) {
                crud.update(
                    'user',
                    user_map,
                     function (result_list) {
                         var
                          result_map;
                         if (result_list != null && result_list.length > 0) {
                             result_map = result_list[0];

                         } else {
                             result_map = [];
                         }

                     }
                );

            });
            // End /updateuser/ message handler



            // Begin /addgraph/ message handler
            // Summary : Provides graph save capability.
            // Arguments : A single graph_map object.
            // graph_map should have the following properties:
            // name = the name of the graph
            // states = the states of the graph
            // Action :
            // If a graph with the provided name already exists
            // in Mongo, use the existing graph object and ignore
            // other input.
            // If a graph with the provided name does not exist
            // in Mongo, create one and use it.
            // Send a 'graphupdate' message to the sender so that
            // a save cycle can complete. 
            //
            socket.on('addgraph', function (graph_map) {
                console.log(JSON.stringify(graph_map, null, 2));
                crud.construct(
                    'graph',
                     {
                         user_id: graph_map.user_id,
                         name: graph_map.name,
                         created: graph_map.created,
                         modified: graph_map.modified,
                         states: graph_map.states
                     },
                    function (result_list) {
                        var
                            result_map;
                        if (result_list != null && result_list.length > 0) {
                            result_map = result_list[0];

                        } else {
                            result_map = [];
                        }
                        socket.emit('graphupdate', result_map);
                    }
                );
            });
            // End /addgraph/ message handler

            // Begin /updategraph/ message handler
            // Summary : Handles client updates of graphs
            // and emits result map when finished.
            // Arguments : A single graph_map object.
            // graph_map should have the following properties:
            // _id = the id of the user to update
            // modified = date and time that the graph was midified (Date obj)
            // states = the states and transitions of the graph
            // Action :
            // This handler updates the entry in MongoDB
            //
            socket.on('updategraph', function (graph_map) {
                crud.update(
                'graph',
                {
                    '_id': graph_map._id
                },
                {
                    'name': graph_map.name,
                    'modified': graph_map.modified,
                    'states': graph_map.states
                },
                 function (result_list) {
                     console.log(JSON.stringify(result_list, null, 2));
                     var
                      result_map;
                     if (result_list != null && result_list.length > 0) {
                         result_map = result_list[0];

                     } else {
                         result_map = [];
                     }
                     socket.emit('graphupdate', result_map);
                 }
                );
            }); 
            // End /updategraph/ message handler

            // End /getgraph/ message handler
            // Summary : Handles client request of graphs
            // and emits result map when finished.  Requests are
            // made using the user id of the user in the find map
            // to search for all graphs with a user id that matches.
            // Arguments : A single graph_map object.
            // graph_map should have the following properties:
            // user_id = the id of the user
            //
            socket.on('getgraph', function (graph_map) {
                crud.read(
                'graph',
                { 'user_id': graph_map.user_id },
                  function (result_list) {
                      var result_map;
                      if (result_list != null && result_list.length > 0) {
                          result_map = result_list;
                         
                      } else {
                          result_map = [];
                      }
                      socket.emit('graphreceived', result_map);
                  }
                );
            });
            // End /getgraph/ message handler
           
        });
        // End io setup
        return io;
    }
};

module.exports = userObj;
// ----------------- END PUBLIC METHODS -------------------