// var mongoose = require('mongoose');
var _ = require('lodash');
var config = require('cabrel-config')();
var externals = {};
var Hapi = require('hapi');
var stockpile = require('cabrel-stockpile');
var Q = require('q');

var T = Hapi.types;

externals.storeObject = {
  method: 'POST',
  path: '/api/<something>',
  config: {
    // validate: {
    //   query: {
    //   },
    //   payload: {
    //   }
    // },
    handler: function(request) {
    }
  }
};

module.exports = externals;
