var expect = require('expect.js'),
    sessions = require('../');


describe('cabrel-hapi-session', function() {
  var sessionId = null;

  describe('#storeSession', function() {
    it('returns a valid guid', function(done) {
      sessions.storeSession({a: 1}, 'password123').done(function(result) {
        expect(result).to.contain('-');
        sessionId = result;
        done();
      });
    });
  });

  describe('#fetchSession', function() {
    it('returns session object', function(done) {
      sessions.fetchSession(sessionId, 'password123').done(function(result) {
        expect(result).to.be.an(Object);
        expect(result.a).to.be(1);
        done();
      });
    });
  });

  describe('#removeSession', function() {
    it('removes a session', function(done) {
      sessions.removeSession(sessionId).then(function() {
        return sessions.fetchSession(sessionId, 'password123');
      }).done(null, function(error) {
        expect(error).to.be.an(Error);
        done();
      });
    });
  });
});
