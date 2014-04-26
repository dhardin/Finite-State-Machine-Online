/*
* chat.js - module to provide chat messaging
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
//chatterMap = {};
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

// signIn - updat id_online property and chatterMap
//
signIn = function (io, user_map, socket) {
     console.log('signing in...');
    //crud.update(
    //    'user',
    //    { '_id': user_map._id },
    //   // {is_online : true},
    //    function (result_map) {
    //        //emitUserList(io);
    //        //user_map.is_online = true;
    //        //socket.emit('userupdate', user_map);
    //    }
    //);

 //   chatterMap[user_map._id] = socket;
    socket.user_id = user_map._id;
}

// signOut - update is_online property and chatterMap
//
signOut = function (io, user_id) {
    //crud.update(
    //    'user',
    //    {'_id' : user_id},
    //  //  { is_online: false },
    //    function (result_list) { }// emitUserList(io);}
    //);
   // delete chatterMap[user_id];
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
            // Summary : Provides sign in capability.
            // Arguments : A single user_map object.
            // user_map should have the following properties:
            // name = the name of the user
            // cid = the client id
            // Action :
            // If a user with the provided username already exists
            // in Mongo, use the existing user object and ignore
            // other input.
            // If a user with the provided username does not exist
            // in Mongo, create one and use it.
            // Send a 'userupdate' message to the sender so that
            // a login cycle can complete. Ensure the client id
            // is passed back so the client can correlate the user,
            // but do not store it in MongoDB.
            // Mark the user as online and send the updated online
            // user list to all clients, including the client that
            // originated the 'adduser' message.
            //
            socket.on('adduser', function (user_map) {
                crud.read(
                    'user',
                    { name: user_map.name },
                    function (result_list) {
                        var
                            result_map,
                            cid = user_map.cid;
                        
                        delete user_map.cid;

                        // use existing user with provided name
                        if (result_list.length > 0) {
                            result_map = result_list[0];
                            result_map.cid = cid;
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
                                    result_map.cid = cid;
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
            // Begin disconnect methods
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
            // Begin disconnect methods
            socket.on('logout', function () {
                console.log(
                '** user %s logged out **', socket.user_id
                );
                signOut(io, socket.user_id);
            });
            socket.on('disconnect', function () {
                console.log(
                '** user %s closed browser window or tab **',
                socket.user_id
                ); signOut(io, socket.user_id);
            });

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




            // Summary : Provides graph save capability.
            // Arguments : A single graph_map object.
            // graph_map should have the following properties:
            // name = the name of the graph
            // cid = the client id
            // states = the states (array) of the graph
            // states contains an array of transitions
            // Action :
            // If a graph with the provided name already exists
            // in Mongo, use the existing graph object and ignore
            // other input.
            // If a graph with the provided name does not exist
            // in Mongo, create one and use it.
            // Send a 'graphupdate' message to the sender so that
            // a save cycle can complete. Ensure the client id
            // is passed back so the client can correlate the graph,
            // but do not store it in MongoDB.
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
            // Arguments : A single graph_map object.
            // graph_map should have the following properties:
            // _id = the id of the user to update
            // data_map = the data map for states and transitions
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
            }); // End /updategraph/ message handler


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
            }); // End /updategraph/ message handler
           
        });
        // End io setup
        return io;
    }
};

module.exports = userObj;
// ----------------- END PUBLIC METHODS -------------------