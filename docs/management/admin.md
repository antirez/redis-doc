---
title: Redis administration
linkTitle: Administration
weight: 1
description: Advice for configuring and managing Redis in production
aliases: [
    /topics/admin,
    /topics/admin.md,
    /manual/admin,
    /manual/admin.md
]
---

## Redis setup tips

### Linux

* Deploy Redis using the Linux operating system. Redis is also tested on OS X, and from time to time on FreeBSD and OpenBSD systems. However, Linux is where most of the stress testing is performed, and where most production deployments are run.

* Set the Linux kernel overcommit memory setting to 1. Add `vm.overcommit_memory = 1` to `/etc/sysctl.conf`. Then, reboot or run the command `sysctl vm.overcommit_memory=1` to activate the setting. See [FAQ: Background saving fails with a fork() error on Linux?](https://redis.io/docs/get-started/faq/#background-saving-fails-with-a-fork-error-on-linux) for details. 

* To ensure the Linux kernel feature Transparent Huge Pages does not impact Redis memory usage and latency, run the command: `echo never > /sys/kernel/mm/transparent_hugepage/enabled` to disable it. See [Latency Diagnosis - Latency induced by transparent huge pages](https://redis.io/docs/management/optimization/latency/#latency-induced-by-transparent-huge-pages) for additional context. 

* The default operating system limits on mmap counts is likely to be too low, which may result in out of memory exceptions Add `vm.max_map_count = 262144` to `/etc/sysctl.conf`. Then, reboot or run the command `sysctl vm.max_map_count=262144` to activate the setting.

### Memory

* Ensured that swap is enabled and that your swap file size is equal to amount of memory on your system. If Linux does not have swap set up, and your Redis instance accidentally consumes too much memory, Redis can crash when it is out of memory, or the Linux kernel OOM killer can kill the Redis process. When swapping is enabled, you can detect latency spikes and act on them.

* Set an explicit `maxmemory` option limit in your instance to make sure that it will report errors instead of failing when the system memory limit is near to be reached. Note that `maxmemory` should be set by calculating the overhead for Redis, other than data, and the fragmentation overhead. So if you think you have 10 GB of free memory, set it to 8 or 9.

* If you are using Redis in a write-heavy application, while saving an RDB file on disk or rewriting the AOF log, Redis can use up to 2 times the memory normally used. The additional memory used is proportional to the number of memory pages modified by writes during the saving process, so it is often proportional to the number of keys (or aggregate types items) touched during this time. Make sure to size your memory accordingly.

* See the `LATENCY DOCTOR` and `MEMORY DOCTOR` commands to assist in troubleshooting.

### Imaging

* When running under daemontools, use `daemonize no`.

### Replication

* Set up a non-trivial replication backlog in proportion to the amount of memory Redis is using. The backlog allows replicas to sync with the primary (master) instance much more easily.

* If you use replication, Redis performs RDB saves even if persistence is disabled. (This does not apply to diskless replication.) If you don't have disk usage on the master, enable diskless replication.

* If you are using replication, ensure that either your master has persistence enabled, or that it does not automatically restart on crashes. Replicas will try to maintain an exact copy of the master, so if a master restarts with an empty data set, replicas will be wiped as well.

### Security

* By default, Redis does not require any authentication and listens to all the network interfaces. This is a big security issue if you leave Redis exposed on the internet or other places where attackers can reach it. See for example [this attack](http://antirez.com/news/96) to see how dangerous it can be. Please check our [security page](/topics/security) and the [quick start](/topics/quickstart) for information about how to secure Redis.

## Running Redis on EC2

* Use HVM based instances, not PV based instances.
* Do not use old instance families. For example, use m3.medium with HVM instead of m1.medium with PV.
* The use of Redis persistence with EC2 EBS volumes needs to be handled with care because sometimes EBS volumes have high latency characteristics.
* You may want to try the new diskless replication if you have issues when replicas are synchronizing with the master.

## Upgrading or restarting a Redis instance without downtime

Redis is designed to be a long-running process in your server. You can modify many configuration options without a restart using the `CONFIG SET` command. You can also switch from AOF to RDB snapshots persistence, or the other way around, without restarting Redis. Check the output of the `CONFIG GET *` command for more information.

From time to time, a restart is required, for example, to upgrade the Redis process to a newer version, or when you need to modify a configuration parameter that is currently not supported by the `CONFIG` command.

Follow these steps to avoid downtime.

* Set up your new Redis instance as a replica for your current Redis instance. In order to do so, you need a different server, or a server that has enough RAM to keep two instances of Redis running at the same time.

* If you use a single server, ensure that the replica is started on a different port than the master instance, otherwise the replica cannot start.

* Wait for the replication initial synchronization to complete. Check the replica's log file.

* Using `INFO`, ensure the master and replica have the same number of keys. Use `redis-cli` to check that the replica is working as expected and is replying to your commands.

* Allow writes to the replica using `CONFIG SET slave-read-only no`.

* Configure all your clients to use the new instance (the replica). Note that you may want to use the `CLIENT PAUSE` command to ensure that no client can write to the old master during the switch.

* Once you confirm that the master is no longer receiving any queries (you can check this using the `MONITOR` command), elect the replica to master using the `REPLICAOF NO ONE` command, and then shut down your master.

If you are using [Redis Sentinel](/topics/sentinel) or [Redis Cluster](/topics/cluster-tutorial), the simplest way to upgrade to newer versions is to upgrade one replica after the other. Then you can perform a manual failover to promote one of the upgraded replicas to master, and finally promote the last replica.

---
**NOTE** 

Redis Cluster 4.0 is not compatible with Redis Cluster 3.2 at cluster bus protocol level, so a mass restart is needed in this case. However, Redis 5 cluster bus is backward compatible with Redis 4.

---
