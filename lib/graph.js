/*
* graph.js - module to provide graph i/o
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
graphObj,
socket = require('socket.io'),
crud = require('./crud'),
makeMongoId = crud.makeMongoId;
// ------------- END MODULE SCOPE VARIABLES ---------------
// ---------------- BEGIN UTILITY METHODS -----------------
// ---------------- END UTILITY METHODS -----------------
// ---------------- BEGIN PUBLIC METHODS ------------------
graphObj = {
    connect: function (server) {
        var io = socket.listen(server);
        // Begin io setup
        io
        .set('blacklist', [])
        .of('/graph')
        .on('connection', function (socket) {
            // Begin /addgraph/ message handler
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
                crud.read(
                    'graph',
                    { id: graph_map.id },
                    function (result_list) {
                        var
                            result_map;
                        //    cid = graph_map.cid;
                        
                        //delete graph_map.cid;

                        // use existing graph with provided id
                        if (result_list.length > 0) {
                            result_map = result_list[0];
                            //result_map.cid = cid;
                            //signIn(io, result_map, socket);

                        }

                        // create graph with new name
                        else {
                           
                            crud.construct(
                                'graph',
                                graph_map,
                                function (result_list) {
                                    result_map = result_list[0];
                                    //result_map.cid = cid;
                                    socket.user_id = result_map._id;
                                    socket.emit('updategraph', result_map);
                                }
                            );
                        }
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
                { '_id': makeMongoId(graph_map._id) },
                {
                    name: graph_map.name,
                    states: graph_map.states
                }
                );
            }); // End /updategraph/ message handler
           
        });
        // End io setup
        return io;
    }
};

module.exports = graphObj;
// ----------------- END PUBLIC METHODS -------------------