The `CLIENT SETINFO` command assigns various info attributes to the current connection which are displayed in the output of `CLIENT LIST` and `CLIENT INFO`.

Client libraries are expected to pipeline this command after authentication on all connections
and ignore failures since they could be connected to an older version that doesn't support them.

Currently the supported attributes are:
* `lib-name` - meant to hold the name of the client library that's in use.
* `lib-ver` - meant to hold the client library's version.

There is no limit to the length of these attributes. However, it is not possible to use spaces, newlines, or other non-printable characters that would violate the format of the `CLIENT LIST` reply.

[Official client libraries](https://redis.io/docs/clients/) allow extending `lib-name` with a custom suffix to expose additional information about the client. 
For example, high-level libraries like [redis-om-spring](https://github.com/redis/redis-om-spring) can report their version. 
The resulting `lib-name` would be `jedis(redis-om-spring_v1.0.0)`. 
Brace characters are used to delimit the custom suffix and should be avoided in the suffix itself.
We recommend using the following format for the custom suffixes for third-party libraries `(?<custom-name>[ -~]+)[ -~]v(?<custom-version>[\d\.]+)` and use `;` to delimit multiple suffixes.

Note that these attributes are **not** cleared by the RESET command.
