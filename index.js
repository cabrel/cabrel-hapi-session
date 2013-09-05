var internals = {};
var hapi = require('hapi');
var config = require('cabrel-config')();

var Q = require('q');

Q.all([
  config.get('server', 'host'),
  config.get('server', 'port'),
  config.get('hapi', 'config', true),
  config.get('hapi', 'plugins', true)
]).then(function(result) {
  internals.hostname = result[0];
  internals.port = Number(result[1]);
  internals.hapiConfig = result[2];
  internals.pluginConfig = result[3];

  internals.pack = new hapi.Pack();
  internals.pack.server(internals.port, internals.hapiConfig);
  internals.server = internals.pack._servers[0];

}).then(function() {

  internals.pack.allow({ext: true}).require('good', internals.pluginConfig.good, function(err) {
    if (err) {
      console.log(err);
    }
  });
}).then(function() {
  // var httpEndpoints = require('./api/http');

  // Object.keys(httpEndpoints).forEach(function(ep) {
  //   internals.server.addRoute(httpEndpoints[ep]);
  // });

}).done(function() {
  internals.pack.start(function() {
    console.log('Server started @ %s', internals.server.info.uri);
    // require('./socket')(internals.server);
  });

});
