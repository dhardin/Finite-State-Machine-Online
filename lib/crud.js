/*
* crud.js - module to provide CRUD db capabilities
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
    loadSchema, checkSchema, clearIsOnline,
    checkType, constructObj, readObj,
    updateObj, destroyObj,
    mongodb = require('mongodb'),
    fsHandle = require('fs'),
   // JSV = require('JSV').JSV,
    mongoServer = new mongodb.Server(
    'localhost',
    mongodb.Connection.DEFAULT_PORT
    ),
    //dbHandle = new mongodb.Db(
    //'fsm', mongoServer, { safe: true }
    //),
    mongoose = require('mongoose'),
    //validator = JSV.createEnvironment(),
    objTypeMap = { 'graph': {}, 'user': {}},
    Schema = mongoose.Schema
;
        
mongoose.connect('mongodb://localhost/fsm');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    console.log('** Connected to MongoDB...using mongoose :] **');
});

var userSchema = new Schema({
    username: String,
    password: String
}, { collection: 'user' });

var User = mongoose.model('User', userSchema);

var graphSchema = new Schema({
    user_id: String,
    name: String,
    created: Date,
    modified: Date,
    states: [{
        x: Number,
        y: Number,
        text: String,
        startState: Boolean,
        endState: Boolean,
        transitions: [{
            startState: { x: Number, y: Number },
            endState: { x: Number, y: Number },
            text: String
        }]
    }]
}, { collection: 'graph' });

var Graph = mongoose.model('Graph', graphSchema);
// ---------------- BEGIN SCHEMA DEFINITIONS -----------------

// ---------------- END SCHEMA DEFINITIONS -----------------

// ------------- END MODULE SCOPE VARIABLES ---------------
// ---------------- BEGIN UTILITY METHODS -----------------
//loadSchema = function ( schema_name, schema_path ) {
//    fsHandle.readFile( schema_path, 'utf8', function ( err, data ) {
//        objTypeMap[ schema_name ] = JSON.parse( data );
//    });
//};
//checkSchema = function ( obj_type, obj_map, callback ) {
//    var
//    schema_map = objTypeMap[ obj_type ],
//    report_map = validator.validate( obj_map, schema_map );
//    callback( report_map.errors );
//};
//clearIsOnline = function () {
//    updateObj(
//'user',
//{ is_online : true },
//{ is_online : false },
//function ( response_map ) {
//    console.log('All users set to offline', response_map);
//}
//);
//};
// ----------------- END UTILITY METHODS ------------------
// ---------------- BEGIN PUBLIC METHODS ------------------
checkType = function (obj_type) {
    if (!objTypeMap[obj_type]) {
        return ({
            error_msg: 'Object type "' + obj_type
            + '" is not supported.'
        });
    }
    return null;
};
constructObj = function (obj_type, obj_map, callback) {
    var type_check_map = checkType(obj_type);
    if (type_check_map) {
        callback(type_check_map);
        return;
    }
    switch(obj_type){
        case 'user':
            var user = new User(obj_map);
            user.save(function (err, thor) {
                if (err) {
                    return console.error(err);
                }
                callback(user);
            });
            break;
        case 'graph':
            var graph = new Graph(obj_map);
            graph.save(function (err, thor) {
                if (err) {
                    return console.error(err);
                }
                callback(graph);
            });
            break;
        default:
            callback(false);
    }
    return;
};

readObj = function (obj_type, find_map, callback) {
    var type_check_map = checkType(obj_type);
    if (type_check_map) {
        callback(type_check_map);
        return;
    }
    switch (obj_type) {
        case 'user':
            // Find all users with the find map arg
            User.find(find_map, function (err, users) {
                if (err) {
                    return console.error(err);
                }
                callback(users);
            });
            break;
        case 'graph':
            Graph.find(find_map, function (err, graphs) {
                if (err) {
                    return console.error(err);
                }
                callback(graphs);
            });
            break;
        default:
            callback(false);
    }
    return;
  
};

updateObj = function (obj_type, find_map, set_map, callback) {
    var type_check_map = checkType(obj_type),
        option_map = {
            safe: true,
            multi: false,
            upsert: false
        };
    if (type_check_map) {
        callback(type_check_map);
        return;
    }
    switch (obj_type) {
        case 'user':
            // Find all users with the find map arg
            User.update(find_map, set_map, option_map,  function (err, numberAffected, raw) {
                if (err) {
                    callback(false);
                    return handleError(err);
                }
                callback({ numberAffected: numberAffected, raw: raw });
            });
            break;
        case 'graph':
            // Find all graphs with the find map arg
            Graph.update(find_map, set_map, option_map,  function (err, numberAffected, raw) {
                if (err) {
                    callback(false);
                    return handleError(err);
                }
                callback({ numberAffected: numberAffected, raw: raw });
            });
            break;
        default:
            callback(false);
    }
    return;
};

destroyObj = function (obj_type, find_map, callback) {
    var type_check_map = checkType(obj_type);
    if (type_check_map) {
        callback(type_check_map);
        return;
    }
    switch (obj_type) {
        case 'user':
            // Find all users with the find map arg
            User.remove(find_map, function (err) {
                if (err) {
                    callback(err);
                } else {
                    callback(true);
                }
            });
            break;
        case 'graph':
            Graph.remove(find_map, function (err) {
                if (err) {
                    callback(err);
                } else {
                    callback(true);
                }
            });
            break;
        default:
            callback(false);
    }
    return;
};

//=----------------------------------=
//--------OLD-------------------------
//=----------------------------------=
//constructObj = function (obj_type, obj_map, callback) {
//    var type_check_map = checkType(obj_type);
//    if (type_check_map) {
//        callback(type_check_map);
//        return;
//    }
//    checkSchema(
//    obj_type, obj_map,
//    function (error_list) {
//        if (error_list.length === 0) {
//            dbHandle.collection(
//            obj_type,
//            function (outer_error, collection) {
//                var options_map = { safe: true };
//                collection.insert(
//                obj_map,
//                options_map,
//                function (inner_error, result_map) {
//                    callback(result_map);
//                }
//                );
//            }
//            );
//        }
//        else {
//            callback({
//                error_msg: 'Input document not valid',
//                error_list: error_list
//            });
//        }
//    }
//    );
//};
//readObj = function ( obj_type, find_map, fields_map, callback ) {
//    var type_check_map = checkType( obj_type );
//    if ( type_check_map ) {
//        callback( type_check_map );
//        return;
//    }
//    dbHandle.collection(
//    obj_type,
//    function ( outer_error, collection ) {
//        collection.find( find_map, fields_map ).toArray(
//        function ( inner_error, map_list ) {
//            callback( map_list );
//        }
//        );
//    }
//    );
//};
//updateObj = function ( obj_type, find_map, set_map, callback ) {
//    var type_check_map = checkType( obj_type );
//    if ( type_check_map ) {
//        callback( type_check_map );
//        return;
//    }
//    checkSchema(
//    obj_type, set_map,
//    function ( error_list ) {
//        if ( error_list.length === 0 ) {
//            dbHandle.collection(
//            obj_type,
//            function ( outer_error, collection ) {
//                collection.update(
//                find_map,
//                { $set : set_map },
//                { safe : true, multi : true, upsert : false },
//                function ( inner_error, update_count ) {
//                    callback({ update_count : update_count });
//                }
//                );
//            }
//            );
//        }
//        else {
//            callback({
//                error_msg : 'Input document not valid',
//                error_list : error_list
//            });
//        }
//    }
//    );
//};
//destroyObj = function ( obj_type, find_map, callback ) {
//    var type_check_map = checkType( obj_type );
//    if ( type_check_map ) {
//        callback( type_check_map );
//        return;
//    }
//    dbHandle.collection(
//  obj_type,
//function (outer_error, collection) {
//    var options_map = { safe: true, single: true };
//    collection.remove(find_map, options_map,
//    function (inner_error, delete_count) {
//        callback({ delete_count: delete_count });
//    }
//    );
//}
//);
//};
module.exports = {
    makeMongoId: mongodb.ObjectID,
    checkType: checkType,
    construct: constructObj,
    read: readObj,
    update: updateObj,
    destroy: destroyObj
};
// ----------------- END PUBLIC METHODS -----------------
// ------------- BEGIN MODULE INITIALIZATION --------------
//dbHandle.open(function () {
//    console.log('** Connected to MongoDB **');
//   // clearIsOnline();
//});
// load schemas into memory (objTypeMap)
//(function () {
//    var schema_name, schema_path;
//    for (schema_name in objTypeMap) {
//        if (objTypeMap.hasOwnProperty(schema_name)) {
//            schema_path = __dirname + '\\' + schema_name + '.json';
//            loadSchema(schema_name, schema_path);
//        }
//    }
//}());
// -------------- END MODULE INITIALIZATION ---------------