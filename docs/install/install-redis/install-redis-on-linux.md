---
title: "Install Redis on Linux"
linkTitle: "Linux"
weight: 1
description: >
    How to install Redis on Linux
aliases:
- /docs/getting-started/installation/install-redis-on-linux
---

Most major Linux distributions provide packages for Redis.

## Install on Ubuntu/Debian

You can install recent stable versions of Redis from the official `packages.redis.io` APT repository.

{{% alert title="Prerequisites" color="warning" %}}
If you're running a very minimal distribution (such as a Docker container) you may need to install `lsb-release`, `curl` and `gpg`:

{{< highlight bash  >}}
sudo apt install lsb-release curl gpg
{{< / highlight  >}}
{{% /alert  %}}

1. Add the repository to the <code>apt</code> and index the repository:

   {{< highlight bash  >}}
   curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg

   echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
   {{< / highlight  >}}
   
1. Update and install redis:
   {< highlight bash  >}}
   sudo apt-get update
   sudo apt-get install redis
   {{< / highlight  >}}

1. Verify that the installation is successful by checking the version of `redis-server` that is installed:
   {{< highlight bash  >}}
   redis-server --version
   {{< / highlight  >}}

   The output is similar to:
   {{< highlight bash  >}}
   Redis server v=7.2.3 sha=00000000:0 malloc=jemalloc-5.3.0 bits=64 build=7f52fd1717e1b756
   {{< / highlight  >}}
   
1. Verify that you are able to connect to the `redis-server` using `redis-cli`:
   {{< highlight bash  >}}
   redis-cli ping
   {{< / highlight  >}}   
   If the connection is successful, `PONG` is returned.
   
## Install from Snapcraft

The [Snapcraft store](https://snapcraft.io/store) provides [Redis packages](https://snapcraft.io/redis) that can be installed on platforms that support snap.
Snap is supported and available on most major Linux distributions.

To install via snap, run:

{{< highlight bash  >}}
sudo snap install redis
{{< / highlight  >}}

If your Linux does not currently have snap installed, install it using the instructions described in [Installing snapd](https://snapcraft.io/docs/installing-snapd).

## Next steps

After you have a running Redis instance, you may want to:

* Try the [Redis CLI tutorial](/docs/connect/cli).
* Connect using one of the [Redis clients](/docs/connect/clients).
