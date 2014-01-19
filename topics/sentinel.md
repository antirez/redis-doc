Redis Sentinel Documentation
===

Redis Sentinel is a system designed to help managing Redis instances.
It performs the following three tasks:

* **Monitoring**. Sentinel constantly check if your master and slave instances are working as expected.
* **Notification**. Sentinel can notify the system administrator, or another computer program, via an API, that something is wrong with one of the monitored Redis instances.
* **Automatic failover**. If a master is not working as expected, Sentinel can start a failover process where a slave is promoted to master, the other additional slaves are reconfigured to use the new master, and the applications using the Redis server informed about the new address to use when connecting.

Redis Sentinel is a distributed system, this means that usually you want to run
multiple Sentinel processes across your infrastructure, and this processes
will use gossip protocols in order to understand if a master is down and
agreement protocols in order to perform the failover and assign a version to
the new configuration.

Redis Sentinel is shipped as a stand-alone executable called `redis-sentinel`
but actually it is a special execution mode of the Redis server itself, and
can be also invoked using the `--sentinel` option of the normal `redis-sever`
executable.

**WARNING:** Redis Sentinel is currently a work in progress. This document
describes how to use what is already implemented, and may change as the
Sentinel implementation evolves.

Redis Sentinel is compatible with Redis 2.4.16 or greater, and Redis 2.6.0 or greater, however it works better if used with Redis instances version 2.8.0 or greater.

Obtaining Sentinel
---

Sentinel is currently developed in the *unstable* branch of the Redis source code at Github. However an update copy of Sentinel is provided with every patch release of Redis 2.8.

The simplest way to use Sentinel is to download the latest verison of Redis 2.8 or to compile Redis latest commit in the *unstable* branch at Github.

Running Sentinel
---

If you are using the `redis-sentinel` executable (or if you have a symbolic
link with that name to the `redis-server` executable) you can run Sentinel
with the following command line:

    redis-sentinel /path/to/sentinel.conf

Otherwise you can use directly the `redis-server` executable starting it in
Sentinel mode:

    redis-server /path/to/sentinel.conf --sentinel

Both ways work the same.

However **it is mandatory** to use a configuration file when running Sentinel, as this file will be used by the system in order to save the current state that will be reloaded in case of restarts. Sentinel will simply refuse to start if no configuration file is given or if the configuration file path is not writable.

Configuring Sentinel
---

The Redis source distribution contains a file called `sentinel.conf`
that is a self-documented example configuration file you can use to
configure Sentinel, however a typical minimal configuration file looks like the
following:

    sentinel monitor mymaster 127.0.0.1 6379 2
    sentinel down-after-milliseconds mymaster 60000
    sentinel failover-timeout mymaster 180000
    sentinel parallel-syncs mymaster 1

    sentinel monitor resque 192.168.1.3 6380 4
    sentinel down-after-milliseconds resque 10000
    sentinel failover-timeout resque 180000
    sentinel parallel-syncs resque 5

The first line is used to tell Redis to monitor a master called *mymaster*,
that is at address 127.0.0.1 and port 6379, with a level of agreement needed
to detect this master as failing of 2 sentinels (if the agreement is not reached
the automatic failover does not start).

However note that whatever the agreement you specify to detect an instance as not working, a Sentinel requires **the vote from the majority** of the known Sentinels in the system in order to start a failover and obtain a new *configuration Epoch* to assign to the new configuraiton afte the failiver.

In other words **Sentinel is not able to perform the failover if only a minority of the Sentinel processes are working**.

The other options are almost always in the form:

    sentinel <option_name> <master_name> <option_value>

And are used for the following purposes:

* `down-after-milliseconds` is the time in milliseconds an instance should not
be reachable (either does not reply to our PINGs or it is replying with an
error) for a Sentinel starting to think it is down. After this time has elapsed
the Sentinel will mark an instance as **subjectively down** (also known as
`SDOWN`), that is not enough to start the automatic failover.
However if enough instances will think that there is a subjectively down
condition, then the instance is marked as **objectively down**. The number of
sentinels that needs to agree depends on the configured agreement for this
master.
* `parallel-syncs` sets the number of slaves that can be reconfigured to use
the new master after a failover at the same time. The lower the number, the
more time it will take for the failover process to complete, however if the
slaves are configured to serve old data, you may not want all the slaves to
resync at the same time with the new master, as while the replication process
is mostly non blocking for a slave, there is a moment when it stops to load
the bulk data from the master during a resync. You may make sure only one
slave at a time is not reachable by setting this option to the value of 1.

The other options are described in the rest of this document and
documented in the example sentinel.conf file shipped with the Redis
distribution.

All the configuration parameters can be modified at runtime using the `SENTINEL` command. See the **Reconfiguring Sentinel at runtime** section for more information.

SDOWN and ODOWN
---

As already briefly mentioned in this document Redis Sentinel has two different
concepts of *being down*, one is called a *Subjectively Down* condition
(SDOWN) and is a down condition that is local to a given Sentinel instance.
Another is called *Objectively Down* condition (ODOWN) and is reached when
enough Sentinels (at least the number configured as the `quorum` parameter
of the monitored master) have an SDOWN condition, and get feedbacks from
other Sentinels using the `SENTINEL is-master-down-by-addr` command.

From the point of view of a Sentinel an SDOWN condition is reached if we
don't receive a valid reply to PING requests for the number of seconds
specified in the configuration as `is-master-down-after-milliseconds`
parameter.

An acceptable reply to PING is one of the following:

* PING replied with +PONG.
* PING replied with -LOADING error.
* PING replied with -MASTERDOWN error.

Any other reply (or no reply) is considered non valid.

Note that SDOWN requires that no acceptable reply is received for the whole
interval configured, so for instance if the interval is 30000 milliseconds
(30 seconds) and we receive an acceptable ping reply every 29 seconds, the
instance is considered to be working.

To switch from SDOWN to ODOWN no strong quorum algorithm is used, but
just a form of gossip: if a given Sentinel gets acknowledge that the master
is not working from enough Sentinels in a given time range, the SDOWN is
promoted to ODOWN. If this acknowledge is later missing, the flag is cleared.

The ODOWN condition **only applies to masters**. For other kind of instances
Sentinel don't require any agreement, so the ODOWN state is never reached
for slaves and other sentinels.

However once a Sentinel sees a master in ODOWN state, it can try to be
elected by the other Sentinels to perform the failover.

Tasks every Sentinel accomplish periodically
---

* Every Sentinel sends a **PING** request to every known master, slave, and sentinel instance, every second.
* An instance is Subjectively Down (**SDOWN**) if the latest valid reply to **PING** was received more than `down-after-milliseconds` milliseconds ago. Acceptable PING replies are: +PONG, -LOADING, -MASTERDOWN.
* If a master is in **SDOWN** condition, every other Sentinel also monitoring this master, is queried for confirmation of this state, every second.
* If a master is in **SDOWN** condition, and enough other Sentinels (to reach the configured quorum) agree about the condition in a given time range, the master is marked as Objectively Down (**ODOWN**).
* Every Sentinel sends an **INFO** request to every known master and slave instance, one time every 10 seconds. If a master is in **ODOWN** condition, its slaves are asked for **INFO** every second instead of being asked every 10 seconds.
* The **ODOWN** condition is cleared if there is no longer acknowledgement about enough other Sentinels about the fact that the master is unreachable. The **SDOWN** condition is cleared as soon as the master starts to reply again to pings.

Sentinels and Slaves auto discovery
---

While Sentinels stay connected with other Sentinels in order to reciprocally
check the availability of each other, and to exchange messages, you don't
need to configure the other Sentinel addresses in every Sentinel instance you
run, as Sentinel uses the Redis master Pub/Sub capabilities in order to
discover the other Sentinels that are monitoring the same master.

This is obtained by sending *Hello Messages* into the channel named
`__sentinel__:hello`.

Similarly you don't need to configure what is the list of the slaves attached
to a master, as Sentinel will auto discover this list querying Redis.

* Every Sentinel publishes a message to every monitored master and slave Pub/Sub channel `__sentinel__:hello`, every two seconds, announcing its presence with ip, port, runid.
* Every Sentinel is subscribed to the Pub/Sub channel `__sentinel__:hello` of every master and slave, looking for unknown sentinels. When new sentinels are detected, they are added as sentinels of this master.
* Hello messages also include the full current configuration of the master. If another Sentinel has a configuration for a given master that is older than the one received, it updates to the new configuration immediately.
* Before adding a new sentinel to a master a Sentinel always checks if there is already a sentinel with the same runid or the same address (ip and port pair). In that case all the matching sentinels are removed, and the new added.

Sentinel API
===

By default Sentinel runs using TCP port 26379 (note that 6379 is the normal
Redis port). Sentinels accept commands using the Redis protocol, so you can
use `redis-cli` or any other unmodified Redis client in order to talk with
Sentinel.

There are two ways to talk with Sentinel: it is possible to directly query
it to check what is the state of the monitored Redis instances from its point
of view, to see what other Sentinels it knows, and so forth.

An alternative is to use Pub/Sub to receive *push style* notifications from
Sentinels, every time some event happens, like a failover, or an instance
entering an error condition, and so forth.

Sentinel commands
---

The following is a list of accepted commands:

* **PING** This command simply returns PONG.
* **SENTINEL masters** Show a list of monitored masters and their state.
* **SENTINEL master `<master name>`** Show the state and info of the specified master.
* **SENTINEL slaves `<master name>`** Show a list of slaves for this master, and their state.
* **SENTINEL get-master-addr-by-name `<master name>`** Return the ip and port number of the master with that name. If a failover is in progress or terminated successfully for this master it returns the address and port of the promoted slave.
* **SENTINEL reset `<pattern>`** This command will reset all the masters with matching name. The pattern argument is a glob-style pattern. The reset process clears any previous state in a master (including a failover in progress), and removes every slave and sentinel already discovered and associated with the master.
* **SENTINEL failover `<master name>`** Force a failover as if the master was not reachable, and without asking for agreement to other Sentinels (however a new version of the configuration will be published so that the other Sentinels will update their configurations).

Reconfiguring Sentinel at Runtime
---

Starting with Redis version 2.8.4, Sentinel provides an API in order to add, remove, or change the configuration of a given master. Note that if you have multiple sentinels you should apply the changes to all to your instances for Redis Sentinel to work properly. This means that changing the configuration of a single Sentinel does not automatically propagates the changes to the other Sentinels in the network.

The following is a list of `SENTINEL` sub commands used in order to update the configuration of a Sentinel instance.

* **SENTINEL MONITOR `<name>` `<ip>` `<port>` `<quorum>`** This command tells the Sentinel to start monitoring a new master with the specified name, ip, port, and quorum. It is identical to the `sentinel monitor` configuration directive in `sentinel.conf` configuration file, with the difference that you can't use an hostname in as `ip`, but you need to provide an IPv4 or IPv6 address.
* **SENTINEL REMOVE `<name>`** is used in order to remove the specified master: the master will no longer be monitored, and will totally be removed from the internal state of the Sentinel, so it will no longer listed by `SENTINEL masters` and so forth.
* **SENTINEL SET `<name>` `<option>` `<value>`** The SET command is very similar to the `CONFIG SET` command of Redis, and is used in order to change configuration parameters of a specific master. Multiple option / value pairs can be specified (or none at all). All the configuration parameters that can be configured via `sentinel.conf` are also configurable using the SET command.

The following is an example of `SENTINEL SET` command in order to modify the `down-after-milliseconds` configuration of a master called `objects-cache`:

    SENTINEL SET objects-cache-master down-after-milliseconds 1000

As already stated, `SENTINEL SET` can be used to set all the configuration parameters that are settable in the startup configuration file. Moreover it is possible to change just the master quorum configuration without removing and re-adding the master with `SENTINEL REMOVE` followed by `SENTINEL MONITOR`, but simply using:

    SENTINEL SET objects-cache-master quorum 5

Note that there is no equivalent GET command since `SENTINEL MASTER` provides all the configuration parameters in a simple to parse format (as a field/value pairs array).

Pub/Sub Messages
---

A client can use a Sentinel as it was a Redis compatible Pub/Sub server
(but you can't use `PUBLISH`) in order to `SUBSCRIBE` or `PSUBSCRIBE` to
channels and get notified about specific events.

The channel name is the same as the name of the event. For instance the
channel named `+sdown` will receive all the notifications related to instances
entering an `SDOWN` condition.

To get all the messages simply subscribe using `PSUBSCRIBE *`.

The following is a list of channels and message formats you can receive using
this API. The first word is the channel / event name, the rest is the format of the data.

Note: where *instance details* is specified it means that the following arguments are provided to identify the target instance:

    <instance-type> <name> <ip> <port> @ <master-name> <master-ip> <master-port>

The part identifying the master (from the @ argument to the end) is optional
and is only specified if the instance is not a master itself.

* **+reset-master** `<instance details>` -- The master was reset.
* **+slave** `<instance details>` -- A new slave was detected and attached.
* **+failover-state-reconf-slaves** `<instance details>` -- Failover state changed to `reconf-slaves` state.
* **+failover-detected** `<instance details>` -- A failover started by another Sentinel or any other external entity was detected (An attached slave turned into a master).
* **+slave-reconf-sent** `<instance details>` -- The leader sentinel sent the `SLAVEOF` command to this instance in order to reconfigure it for the new slave.
* **+slave-reconf-inprog** `<instance details>` -- The slave being reconfigured showed to be a slave of the new master ip:port pair, but the synchronization process is not yet complete.
* **+slave-reconf-done** `<instance details>` -- The slave is now synchronized with the new master.
* **-dup-sentinel** `<instance details>` -- One or more sentinels for the specified master were removed as duplicated (this happens for instance when a Sentinel instance is restarted).
* **+sentinel** `<instance details>` -- A new sentinel for this master was detected and attached.
* **+sdown** `<instance details>` -- The specified instance is now in Subjectively Down state.
* **-sdown** `<instance details>` -- The specified instance is no longer in Subjectively Down state.
* **+odown** `<instance details>` -- The specified instance is now in Objectively Down state.
* **-odown** `<instance details>` -- The specified instance is no longer in Objectively Down state.
* **+new-epoch** `<instance details>` -- The current epoch was updated.
* **+try-failover** `<instance details>` -- New failover in progress, waiting to be elected by the majority.
* **+elected-leader** `<instance details>` -- Won the election for the specified epoch, can do the failover.
* **+failover-state-select-slave** `<instance details>` -- New failover state is `select-slave`: we are trying to find a suitable slave for promotion.
* **no-good-slave** `<instance details>` -- There is no good slave to promote. Currently we'll try after some time, but probably this will change and the state machine will abort the failover at all in this case.
* **selected-slave** `<instance details>` -- We found the specified good slave to promote.
* **failover-state-send-slaveof-noone** `<instance details>` -- We are trynig to reconfigure the promoted slave as master, waiting for it to switch.
* **failover-end-for-timeout** `<instance details>` -- The failover terminated for timeout, slaves will eventually be configured to replicate with the new master anyway.
* **failover-end** `<instance details>` -- The failover terminated with success. All the slaves appears to be reconfigured to replicate with the new master.
* **switch-master** `<master name> <oldip> <oldport> <newip> <newport>` -- The master new IP and address is the specified one after a configuration change. This is **the message most external users are interested in**.
* **+tilt** -- Tilt mode entered.
* **-tilt** -- Tilt mode exited.

Sentinel failover
===

The failover process consists on the following steps:

* Recognize that the master is in ODOWN state.
* Increment our current epoch (see Raft leader election), and try to be elected for the current epoch.
* If the election failed, retry to be elected again after two times the configured failover timeout and stop for now. Otherwise continue with the following steps.
* Select a slave to promote as master.
* The promoted slave is turned into a master with the command **SLAVEOF NO ONE**.
* The Hello messages broadcasted via Pub/Sub contain the updated configuration starting from now, so that all the other Sentinels will update their config.
* All the other slaves attached to the original master are configured with the **SLAVEOF** command in order to start the replication process with the new master.
* The leader terminates the failover process when all the slaves are reconfigured.

**Note:** every time a Redis instance is reconfigured, either by turning it into a master, a slave, or reconfiguring it as a slave of a different instance, the `CONFIG REWRITE` command is sent to the instance in order to make sure the configuration is persisted on disk.

The Sentinel to elect as master is chosen in the following way:

* We remove all the slaves in SDOWN, disconnected, or with the last ping reply received older than 5 seconds (PING is sent every second).
* We remove all the slaves disconnected from the master for more than 10 times the configured `down-after` time.
* Of all the remaining instances, we get the one with the greatest replication offset if available, or the one with the lowest `runid`, lexicographically, if the replication offset is not available or the same.

Consistency qualities of Sentinel failover
---

The Sentinel failover uses the leader election from the Raft algorithm in order
to guarantee that only a given leader is elected in a given epoch.

This means that there are no two Sentinels that will try to perform the
election in the same epoch. Also Sentinels will never vote another leader for
a given epoch more than one time.

Higher configuration epochs always win over older epochs, so every Sentinel will
actively replace its configuration with a new one.

Basically it is possible to think to Sentinel configurations as a state with an associated version. The state is **eventually propagated** to all the other Sentinels in a last-write-wins fashion (that is, last configuration wins).

For example during network partitions, a given Sentinel can claim an older configuration, that will be updated as soon as the Sentinel is already able to receive an update.

In environments where consistency is important during network partitions, it is suggested to use the Redis option that stops accepting writes if not connected to at least a given number of slaves instances, and at the same time to run a Redis Sentinel process in every physical or virtual machine where a Redis master or slave is running.

Sentinel persistent state
---

Sentinel state is persisted in the sentinel configuration file. For example
every time a new configuration is received, or created (leader Sentinels), for
a master, the configuration is persisted on disk together with the configuration
epoch. This means that it is safe to stop and restart Sentinel processes.

Sentinel reconfiguration of instances outside the failover procedure.
---

Even when no failover is in progress, Sentinels will always try to set the
current configuration on monitored instances. Specifically:

* Slaves (according to the current configuration) that claim to be masters, will be configured as slaves to replicate with the current master.
* Slaves connected to a wrong master, will be reconfigured to replicate with the right master.

However when this conditions are encountered Sentinel waits enough time to be sure to catch a configuration update in via Pub/Sub Hello messages before to reconfigure the instances, in order to avoid that Sentinels with a stale configuration will try to change the slaves configuration without a good reason.

TILT mode
---

Redis Sentinel is heavily dependent on the computer time: for instance in
order to understand if an instance is available it remembers the time of the
latest successful reply to the PING command, and compares it with the current
time to understand how old it is.

However if the computer time changes in an unexpected way, or if the computer
is very busy, or the process blocked for some reason, Sentinel may start to
behave in an unexpected way.

The TILT mode is a special "protection" mode that a Sentinel can enter when
something odd is detected that can lower the reliability of the system.
The Sentinel timer interrupt is normally called 10 times per second, so we
expect that more or less 100 milliseconds will elapse between two calls
to the timer interrupt.

What a Sentinel does is to register the previous time the timer interrupt
was called, and compare it with the current call: if the time difference
is negative or unexpectedly big (2 seconds or more) the TILT mode is entered
(or if it was already entered the exit from the TILT mode postponed).

When in TILT mode the Sentinel will continue to monitor everything, but:

* It stops acting at all.
* It starts to reply negatively to `SENTINEL is-master-down-by-addr` requests as the ability to detect a failure is no longer trusted.

If everything appears to be normal for 30 second, the TILT mode is exited.

Handling of -BUSY state
---

(Warning: Yet not implemented)

The -BUSY error is returned when a script is running for more time than the
configured script time limit. When this happens before triggering a fail over
Redis Sentinel will try to send a "SCRIPT KILL" command, that will only
succeed if the script was read-only.

Sentinel clients implementation
---

Sentinel requires explicit client support, unless the system is configured to execute a script that performs a transparent redirection of all the requests to the new master instance (virtual IP or other similar systems). The topic of client libraries implementation is covered in the document [Sentinel clients guidelines](/topics/sentinel-clients).
