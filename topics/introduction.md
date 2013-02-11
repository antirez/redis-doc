Introduction to Redis
===

Redis is an open source, advanced **key-value store**.  It
is often referred to as a **data structure server** since
keys can contain [strings](/topics/data-types#strings),
[hashes](/topics/data-types#hashes), [lists](/topics/data-types#lists),
[sets](/topics/data-types#sets) and [sorted
sets](/topics/data-types#sorted-sets).

You can run **atomic operations**
on these types, like [appending to a string](/commands/append);
[incrementing the value in a hash](/commands/hincrby); [pushing to a
list](/commands/lpush); [computing set intersection](/commands/sinter),
[union](/commands/sunion) and [difference](/commands/sdiff);
or [getting the member with highest ranking in a sorted
set](/commands/zrangebyscore).

In order to achieve its outstanding performance, Redis works with an
**in-memory dataset**. Depending on your use case, you can persist it either
by [dumping the dataset to disk](/topics/persistence#snapshotting)
every once in a while, or by [appending each command to a
log](/topics/persistence#append-only-file).

Redis also supports trivial-to-setup [master-slave
replication](/topics/replication), with very fast non-blocking first
synchronization, auto-reconnection on net split and so forth.

Other features include a simple [check-and-set
mechanism](/topics/transactions), [pub/sub](/topics/pubsub)
and configuration settings to make Redis behave like a
cache.

You can use Redis from [most programming languages](/clients) out there. 

Redis is written in **ANSI C** and works in most POSIX systems like Linux,
\*BSD, OS X without external dependencies. Linux and OSX are the two operating systems where Redis is developed and more tested, and we **recommend using Linux for deploying**. Redis may work in Solaris-derived systems like SmartOS, but the support is *best effort*. There
is no official support for Windows builds, although you may
have [some](http://code.google.com/p/redis/issues/detail?id=34)
[options](https://github.com/dmajkic/redis).

Why Redis?
==========

Redis is worth your time because it allows for incredibly fast storage since it is held **in memory**. This means that 
data that is held inside Redis is kept in your RAM (which is blazing fast) and kept off the hard drive (which is not as
fast), unless you decide to dump the dataset to disk (this would be done if you were, for example, running out of 
memory). 

This means that for some things, Redis will be much, much faster than putting the same data in a traditional database
such as MySQL. 
