cabrel-hapi-session
================

#NO LONGER MAINTAINED

Stores a v4 UUID in a cookie and uses that ID to store session data in Redis.

The redis keys are split between a ZSET for maintaining 24 hours worth of valid sessions and a hash where each property is the ID and the value is an Iron encrypted string
