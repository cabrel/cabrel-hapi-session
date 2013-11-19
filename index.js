var _ = require('lodash');
var config = require('cabrel-config')();
var hapi = require('hapi');
var internals = { properties: {} };
var NodeUtil = require('util');

var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

var Q = require('q');

var winston = require('winston');
require('cabrel-winston-redis').Redis;

Q.all([
  config.get('logging', 'host'),
  config.get('logging', 'port'),
  config.get('logging', 'db'),
  config.get('server', 'host'),
  config.get('server', 'port'),
  config.get('hapi', 'config', true),
  config.get('hapi', 'plugins', true),
  config.get('crypt', 'cookies'),
  config.get('crypt', 'iron')
]).then(function(result) {
  var logHost = result[0];
  var logPort = Number(result[1]);
  var logDb = Number(result[2]);
  internals.properties['hostname'] = result[3];
  internals.properties['port'] = Number(result[4]);
  internals.properties['hapiConfig'] = result[5];
  internals.properties['pluginConfig'] = result[6];
  internals.properties['cookiePassword'] = result[7];
  internals.properties['ironPassword'] = result[8];

  winston.add(winston.transports.Redis, {
    'host': logHost,
    'port': logPort,
    'db': logDb,
    'container': 'logstash'
  });

  winston.remove(winston.transports.Console);
  winston.add(winston.transports.File, { filename: '/var/log/node-seed.log', maxsize: (1024 * 1024) * 5 });

}).then(function() {
  internals.pack = new hapi.Pack();
  internals.pack.server(internals.properties.host, internals.properties.port, internals.properties.hapiConfig);
  internals.server = internals.pack._servers[0];

  internals.server.app.iron = { password: internals.properties.ironPassword };
  internals.server.app.cookies = { password: internals.properties.cookiePassword };

}).then(function() {
  internals.pack.allow({ext: true}).require('good', internals.properties.pluginConfig.good, function(err) {
    if (err) {
      console.log(err);
    }
  });

}).then(function() {
  // configure the server authentication
  internals.server.auth('session', {
    clearInvalid: true,
    isSecure: true,
    password: internals.properties.cookiePassword,
    redirectTo: '/login',
    scheme: 'cookie',
    validateFunc: function(session, callback) {
      if (typeof session.sessionId !== 'undefined') {
        users.fetchSession(session.sessionId).done(function(result) {
          if (result) {
            return callback(null, true, JSON.parse(result));
          } else {
            return callback(null, false, null);
          }
        }, function(error) {
          return callback(error, false, null);
        });
      } else {
        return callback(null, false, null);
      }
    }
  });

}).then(function() {
  var httpEndpoints = require('./api/example');

  Object.keys(httpEndpoints).forEach(function(ep) {
    internals.server.addRoute(httpEndpoints[ep]);
  });
}).done(function() {
  if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
      winston.info('cluster worker %s died', worker.process.pid);
    });

    cluster.on('online', function(worker) {
      winston.info('cluster worker %s is online', worker.process.pid);
    });

  } else {
    internals.pack.start(function() {
      console.log('Server started @ %s', internals.server.info.uri);
      internals.server.on('log', function(event, tags) {
        if (tags.error) {
          winston.error('Hapi log event', { 'data': event.data, 'tags': tags });
        }
      });

      internals.server.on('internal error', function(request, error) {
        winston.error('Hapi internal error for: ' + request.id, {
          'error': error,
          'info': request.info,
          'auth': request.auth || {}
        });
      });
    });
  }
}, function(error) {
  console.log(error);
  winston.error('internal error', { 'msg': JSON.stringify(error.message) });
});
