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
    userSchema, graphSchema,
    User, Graph,
    mongodb = require('mongodb'),
    fsHandle = require('fs'),
    mongoServer = new mongodb.Server(
    'localhost',
    mongodb.Connection.DEFAULT_PORT
    ),
    mongoose = require('mongoose'),
    objTypeMap = { 'graph': {}, 'user': {}},
    Schema = mongoose.Schema
;
        
mongoose.connect('mongodb://localhost/fsm');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    console.log('** Connected to MongoDB**');
});
// ---------------- BEGIN SCHEMA DEFINITIONS -----------------
userSchema = new Schema({
    username: String,
    password: String
}, { collection: 'user' });

User = mongoose.model('User', userSchema);

graphSchema = new Schema({
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

Graph = mongoose.model('Graph', graphSchema);
// ---------------- END SCHEMA DEFINITIONS -----------------

// ------------- END MODULE SCOPE VARIABLES ---------------
// ---------------- BEGIN UTILITY METHODS -----------------
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
// -------------- END MODULE INITIALIZATION ---------------