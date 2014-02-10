var promise = require('when');
var nodefn = require('when/node/function');
var config = require('cabrel-config')();
var stockpile = require('cabrel-stockpile');
var crypto_wrapper = require('cabrel-crypto-wrapper');
var Proto = require('uberproto');

var internals = {
  client: config.buildRedisClient()
};

var Uuid = require('node-uuid');


var Scheme = Proto.extend({
  /**
   * [init description]
   *
   * @param  {[type]} server  [description]
   * @param  {[type]} options [description]
   *
   * @return {[type]}         [description]
   */
  init: function init(server, options) {
    this.server = server;

    this.options = options;
  },

  /**
   * [fetchSession description]
   *
   * @param  {[type]} id           [description]
   *
   * @return {[type]}              [description]
   */
  fetchSession: function fetchSession(id) {
    if (!id) {
      return promise.reject(new Error('ID undefined'));
    }

    var self = this;
    var prefix = config.config.prefix;
    var timestamp = stockpile.conversions.periods.midnight.unix();

    var maint_key = prefix + ':known_sessions:' + timestamp;
    var key = prefix + ':sessions';

    var zrank = nodefn.lift(internals.client.zrank.bind(internals.client));
    var hget = nodefn.lift(internals.client.hget.bind(internals.client));

    return zrank(maint_key, id).then(function(result) {
      if (result !== null) {
        return hget(key, id);
      } else {
        throw new Error('Session not found');
      }
    }).then(function(result) {
      return crypto_wrapper.iron.unseal(result, self.options.ironPassword);
    });
  },

  /**
   * [storeSession description]
   *
   * @param  {[type]} data         [description]
   *
   * @return {[type]}              [description]
   */
  storeSession: function storeSession(data) {
    if (!data) {
      return promise.reject(new Error('Session data required'));
    }

    var self = this;
    var prefix = config.config.prefix;
    var timestamp = stockpile.conversions.periods.midnight.unix();

    var maint_key = prefix + ':known_sessions:' + timestamp;
    var key = prefix + ':sessions';
    var id = Uuid.v4();

    data['sessionId'] = id;

    return crypto_wrapper.iron.seal(data, self.options.ironPassword).then(function(result) {
      // result is the sealed payload
      var commands = [['ZADD', maint_key, 1, id], ['HSET', key, id, result]];
      var multi = internals.client.multi(commands);

      var zadd = nodefn.lift(internals.client.zadd.bind(internals.client));
      var hset = nodefn.lift(internals.client.hset.bind(internals.client));

      return zadd(maint_key, 1, id).then(function() {
        return hset(key, id, result);
      }).then(function() {
        return id;
      });
    });
  },

  /**
   * [removeSession description]
   *
   * @param  {[type]} id [description]
   *
   * @return {[type]}    [description]
   */
  removeSession: function removeSession(id) {
    var prefix = config.config.prefix;
    var timestamp = stockpile.conversions.periods.midnight.unix();

    var maint_key = prefix + ':known_sessions:' + timestamp;
    var key = config.config.prefix + ':sessions';

    var commands = [['ZREM', maint_key, id], ['HDEL', key, id]];
    var multi = internals.client.multi(commands);
    var exec = nodefn.lift(multi.exec.bind(multi));

    return exec();
  },

  /**
   * [authenticate description]
   *
   * @param  {[type]} cookiePassword [description]
   * @param  {[type]} redirectTo     [description]
   * @param  {[type]} ironPassword   [description]
   *
   * @return {[type]}                [description]
   */
  setup: function setup() {
    /*cookiePassword, redirectTo, ironPassword*/
    var self = this;

    return {
      clearInvalid: true,
      isSecure: true,
      password: self.options.cookiePassword,
      redirectTo: self.options.redirectTo,
      validateFunc: function(session, callback) {
        if (stockpile.checks.isDefined(session.sessionId)) {
          self.fetchSession(session.sessionId, self.options.ironPassword).done(function(result) {
            if (result) {
              if (stockpile.checks.isObject(result)) {
                return callback(null, true, result);
              } else if (stockpile.checks.isString(result)) {
                return callback(null, true, JSON.parse(result));
              }
            } else {
              return callback(null, false);
            }
          }, function(error) {
            return callback(error);
          });
        } else {
          return callback(null, false);
        }
      }
    };
  },

  /**
   * [payload description]
   *
   * @param  {[type]}   request [description]
   * @param  {Function} next    [description]
   *
   * @return {[type]}           [description]
   */
  payload: function payload(request, next) {
    next();
  },

  /**
   * [response description]
   *
   * @param  {[type]}   request [description]
   * @param  {Function} next    [description]
   *
   * @return {[type]}           [description]
   */
  response: function response(request, next) {
    next();
  }
});


/**
 * [scheme description]
 *
 * @param  {[type]} server  [description]
 * @param  {[type]} options [description]
 *
 * @return {[type]}         [description]
 */
exports.scheme = function scheme(server, options) {
  return Scheme.create(server, options);
};
