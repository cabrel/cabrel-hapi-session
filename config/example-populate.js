var _ = require('lodash');
var crypto = require('crypto');
var moment = require('moment');
var path = require('path');
var Q = require('q');
var qs = require('querystring');
var url = require('url');

var loader = require('cabrel-config')();

var externals = {};


var salt = crypto.createHash('sha256').update(crypto.randomBytes(256)).digest('hex');

var crypt_seeds = {
  // Configuration: seeds: { cookies, csrf, iron }
  //
  // The values are of little importance, but they are used when encrypting
  // the body of any payload or cookie, so each should be reasonably random and long.
  //
  // the csrf get an additional salt added to their value which is
  // generated every time the server is started (or restarted). the iron value does not since
  // the server needs to be able to decrypt incoming payloads from external
  // sources (verification emails, password resets, etc..)
  //
  cookies: 'some_random_stuff_here',
  csrf: 'some_random_stuff_here' + salt,
  iron: 'some_random_stuff_here',
  api: 'some_random_stuff_here'
};

var internals = {
  core: {
    server: {
      host: '127.0.0.1',
      port: 3000,
      debug: false
    },
    crypt: crypt_seeds,
    hapi: {
      config: {
        labels: ['api'],
        cors: true,
        debug: {
          request: ['error', 'uncaught']
        },
        payload: {
          maxBytes: (1024 * 1024) * 4 // 4mb
        },
        timeout: {
          client: false
        }
      },
      plugins: {
        lout: {
          endpoint: '/api/docs'
        },
        good: {
          subscribers: {
            console: ['error', 'log', 'request']
          },
          alwaysMeasureOps: false,
          extendedRequests: false,
          leakDetection: true,
          maxLogSize: (1024 * 1024) * 5 // 5mb
        },
        iron: {
          encryption: {
            saltBits: 128,
            algorithm: 'aes-256-cbc',
            iterations: 2
          },
          integrity: {
            saltBits: 128,
            algorithm: 'sha256',
            iterations: 2
          }
        },
        tv: {
          webSocketPort: 8000,
          debugEndpoint: '/debug/console',
          queryKey: 'debug'
        },
        'cabrel-hapi-json': {
          exclude: {
            endpoints: []
          }
        }
      }
    },
    smtp: {
      host: '127.0.0.1',
      port: 25,
      ssl: false,
      username: false,
      password: false,
      from: 'abc@example.com'
    },
    mailTemplates: {
      subject_prefix: '[CABREL-NODE-SEED] ',
      cobham_company: 'Cabrel Node Seed',
      cobham_corporate_web: 'http://www.example.com',
      current_year: '2013'
    }
  },
  production: {
    server: {
      weburi: 'https://www.example.com'
    },
    mailTemplates: {
      app_web: 'https://www.example.com'
    }
  },
  development: {
    server: {
      weburi: 'http://www.example.com'
    },
    mailTemplates: {
      app_web: 'http://www.example.com'
    }
  }
};

if (process.env['PRODUCTION']) {
  console.log('** SETTING PRODUCTION VALUES **');
  var productionKeys = _.keys(internals.production);

  _.each(productionKeys, function(key) {
    if (typeof internals.production[key] === 'object') {
      _.defaults(internals.core[key], internals.production[key]);
    } else {
      internals.core[key] = internals.production[key];
    }
  });

  client = loader.buildRedisClient();
} else {
  console.log('** SETTING DEVELOPMENT VALUES **');
  var developmentKeys = _.keys(internals.development);

  _.each(developmentKeys, function(key) {
    if (typeof internals.development[key] === 'object') {
      _.defaults(internals.core[key], internals.development[key]);
    } else {
      internals.core[key] = internals.development[key];
    }

  });
}

loader.set(internals.core, true, 'config').then(function(result) {
  console.log('Done setting config values');
}).then(function() {
  return loader.get('crypt', 'csrf');
}).then(function(apiKey) {
  if (apiKey === crypt_seeds.csrf) {
    console.log('Config updated successfully');
  } else {
    throw new Error('Configuration failed to update');
  }
}).done(function() {
  process.exit(0);
}, function(error) {
  console.log('Error');
  console.log(error);
  console.log(error.stack);
});

module.exports = externals;
