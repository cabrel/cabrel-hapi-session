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
      port: 3000
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
          maxBytes: (1024 * 1024) * 10, // 10mb
          multipart: {
            mode: 'file',
            maxFieldBytes: (1024 * 1024) * 10
          }
        },
        timeout: {
          client: false
        }
      },
      plugins: {
        good: {
          subscribers: {
            console: ['error', 'log', 'request']
          },
          alwaysMeasureOps: false,
          extendedRequests: true,
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
        'cabrel-hapi-json': {
          exclude: {
            endpoints: []
          }
        }
      }
    },
    logging: {
      host: '127.0.0.1',
      port: 6379,
      db: 2,
      facility: 'node-seed'
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

// compile the config
internals.core = loader.generateConfig(internals.core,
    internals.production,
    internals.development);


loader.set(internals.core, true).done(function(result) {
  console.log('Done');
  process.exit(0);
}, function(error) {
  console.log('Error');
  console.log(error);
  console.log(error.stack);
});

module.exports = externals;
