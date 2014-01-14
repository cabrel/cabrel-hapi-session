var promise = require('when');
var nodefn = require('when/node/function');
var config = require('cabrel-config')();
var stockpile = require('cabrel-stockpile');
var crypto_wrapper = require('cabrel-crypto-wrapper');
var internals = {
  client: config.buildRedisClient()
};

var Uuid = require('node-uuid');


/**
 *  [fetchSession description]
 *
 *  @param     {String}    id
 *  @param     {String}    ironPassword
 *
 *  @return    {Promise}
 */
internals.fetchSession = function(id, ironPassword) {
  if (!id) {
    return promise.reject(new Error('ID undefined'));
  }

  var maint_key = config.config.prefix + ':known_sessions:' + stockpile.conversions.periods.midnight.unix();

  var key = config.config.prefix + ':sessions';

  var zrank = nodefn.lift(internals.client.zrank.bind(internals.client));
  var hget = nodefn.lift(internals.client.hget.bind(internals.client));

  return zrank(maint_key, id).then(function(result) {
    if (result !== null) {
      return hget(key, id);
    } else {
      throw new Error('Session not found');
    }
  }).then(function(result) {
    return crypto_wrapper.iron.unseal(result, ironPassword);
  });
};


/**
 *  [storeSession description]
 *
 *  @param     {String}    id
 *  @param     {Object}    data
 *  @param     {String}    ironPassword
 *
 *  @return    {Promise}
 */
internals.storeSession = function(data, ironPassword) {
  if (!data) {
    return promise.reject(new Error('Session data required'));
  }

  var maint_key = config.config.prefix + ':known_sessions:' + stockpile.conversions.periods.midnight.unix();
  var key = config.config.prefix + ':sessions';
  var id = Uuid.v4();

  data['sessionId'] = id;

  return crypto_wrapper.iron.seal(data, ironPassword).then(function(result) {
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
};


/**
 *  [removeSession description]
 *
 *  @param     {String}    id
 *
 *  @return    {Promise}
 */
internals.removeSession = function(id) {
  var maint_key = config.config.prefix + ':known_sessions:' + stockpile.conversions.periods.midnight.unix();
  var key = config.config.prefix + ':sessions';

  var commands = [['ZREM', maint_key, id], ['HDEL', key, id]];
  var multi = internals.client.multi(commands);
  var exec = nodefn.lift(multi.exec.bind(multi));

  return exec();
};


/**
 *  [cookie description]
 *
 *  @param     {[type]}    cookiePassword
 *  @param     {[type]}    redirectTo
 *  @param     {[type]}    ironPassword
 *
 *  @return    {[type]}
 */
internals.cookie = function(cookiePassword, redirectTo, ironPassword) {
  return {
    clearInvalid: true,
    isSecure: true,
    password: cookiePassword,
    redirectTo: redirectTo,
    scheme: 'cookie',
    validateFunc: function(session, callback) {
      if (stockpile.checks.isDefined(session.sessionId)) {
        internals.fetchSession(session.sessionId, ironPassword).done(function(result) {
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
};


module.exports = internals;
