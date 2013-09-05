var config = {};

if (process.env['PRODUCTION']) {

  config.redis = {
    host: '127.0.0.1',
    port: 6379
    // password: 'something',
    // database: 1
  };

  config.prefix = 'cabrel-node-seed-prod';

} else {

  config.redis = {
    host: '127.0.0.1',
    port: 6379
    // database: 1
  };

  config.prefix = 'cabrel-node-seed-dev';
}

module.exports = config;
