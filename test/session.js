var expect = require('chai').expect;
var sessions = require('../').scheme(null, { ironPassword: 'password123' });


describe('cabrel-hapi-session', function() {
  var sessionId = null;

  describe('#storeSession', function() {
    it('returns a valid guid', function(done) {
      sessions.storeSession({a: 1}).done(function(result) {
        expect(result).to.contain('-');
        sessionId = result;
        done();
      });
    });
  });

  describe('#fetchSession', function() {
    it('returns session object', function(done) {
      sessions.fetchSession(sessionId).done(function(result) {
        expect(result).to.be.an.instanceof(Object);
        expect(result.a).to.equal(1);
        done();
      });
    });
  });

  describe('#removeSession', function() {
    it('removes a session', function(done) {
      sessions.removeSession(sessionId).then(function() {
        return sessions.fetchSession(sessionId);
      }).done(null, function(error) {
        expect(error).to.be.an.instanceof(Error);
        done();
      });
    });
  });
});
