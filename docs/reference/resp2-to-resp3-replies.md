---
title: "RESP2 to RESP3 reply migration guide"
linkTitle: "RESP2 to RESP3 migration"
weight: 4
description: RESP2 to RESP3 reply reference for client library developers
aliases:
    - /topics/resp2-to-resp3-replies/
---

The primary motivation for creating the [RESP3](https://redis.io/docs/reference/protocol-spec/) protocol, the successor to RESP2, was to streamline the developer experience by simplifying response parsing. 
It became evident that developers frequently performed specific data transformations on RESP2 replies, which required hardcoded transformations for each command. 
Addressing these transformations directly at the protocol level reduces client overhead and ensures a more consistent and efficient reply-handling process.  
This documentation provides a reference guide to help developers migrate their clients from RESP2 to RESP3.

**Note**:
> Each of the Redis base command manual pages now includes both RESP2 and RESP3 responses.

### Command replies comparison
- RESP3 introduces many new [simple and aggregate reply types]((https://redis.io/docs/reference/protocol-spec/#resp-protocol-description)).
The following tables compare only commands with non-trivial changes to their replies, primarily for new aggregates introduced in RESP3 that require major changes in the client implementation.
- The types are described using [“TypeScript like” syntax](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html): 
  - `[a, b]` stands for [a tuple](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types) where the exact number of elements and types at specific positions are known.
  - `Array<a>` stands for [an array](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#arrays) where the type of elements is known but not the number of elements.

### Cluster management
| Command        | RESP2 Reply                                                           | RESP3 Reply                                                                                  |
|----------------|-----------------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| CLUSTER SLOTS  | Array<\[number, number, ...\[BlobString, number, BlobString, Array]]> | Array<\[number, number, ...\[BlobString, number, BlobString, Map\<BlobString, BlobString>]]> |
| CLUSTER SHARDS | Array                                                                 | Map                                                                                          |
 | CLUSTER INFO   | BlobString                                                            | VerbatimString                                                                               |
 | CLUSTER NODES  | BlobString                                                            | VerbatimString                                                                               |

### Connection management
| Command     | RESP2 Reply | RESP3 Reply    |
|-------------|-------------|----------------|
| CLIENT INFO | BlobString  | VerbatimString |
| CLIENT LIST | BlobString  | VerbatimString |

### Generic
| Command   | RESP2 Reply | RESP3 Reply            |
|-----------|-------------|------------------------|
| RANDOMKEY | BlobString  | null &#124; BlobString |

### Geo
| Command                     | RESP2 Reply        | RESP3 Reply    |
|-----------------------------|--------------------|----------------|
| GEORADIUS WITHCOORD         | \[..., BlobString] | \[..., Double] |
| GEORADIUSBYMEMBER WITHCOORD | \[..., BlobString] | \[..., Double] |
| GEOSEARCH WITHCOORD         | \[..., BlobString] | \[..., Double] |

### Hash
| Command              | RESP2 Reply        | RESP3 Reply                      |
|----------------------|--------------------|----------------------------------|
| HGETALL              | Array              | Map                              |
| HRANDFIELD WITHVALUE | Array\<BlobString> | Array<\[BlobString, BlobString]> |

### Scripting and functions
| Command                | RESP2 Reply                                                                                                                                                                                             | RESP3 Reply                                                                                                                                                                                  |
|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| FUNCTION LIST          | Array<\[‘library\_name’, BlobString, ‘engine’, BlobString, ‘functions’, Array<\[‘name’, BlobString, ‘description’, BlobString &#124; null, ‘flags’, Array\<BlobString>]>]>                              | Array<\[{ library\_name: BlobString, engine: BlobString, functions: Array<{ name: BlobString, description: BlobString &#124; null, flags: Set\<BlobString> }> }]>                            |
| FUNCTION LIST WITHCODE | Array<\[‘library\_name’, BlobString, ‘engine’, BlobString, ‘functions’, Array<\[‘name’, BlobString, ‘description’, BlobString &#124; null, ‘flags’, Array\<BlobString>]>, ‘library\_code’, BlobString]> | Array<\[{ library\_name: BlobString, engine: BlobString, functions: Array<{ name: BlobString, description: BlobString &#124; null, flags: Set\<BlobString> }>, library\_code: BlobString }]> |

### Server management
| Command       | RESP2 Reply                                                                                                 | RESP3 Reply                                  |
|---------------|-------------------------------------------------------------------------------------------------------------|----------------------------------------------|
| MODULE LIST   | Array<\[BlobString<‘name’>, BlobString, BlobString<‘version’>, number]>                                     | Array<{ name: BlobString, version: number }> |
| MEMORY STATS  | Array                                                                                                       | Map                                          |
| ACL LOG       | \[..., ‘age-seconds’, BlobString, …]                                                                        | { …, ‘age-seconds’: Double }                 |
| ACL GETUSER   | Array                                                                                                       | Map                                          |
| COMMAND       | Array<\[BlobString, number, Set\<BlobString>, number, number, number, Set\<BlobString>, Set\<BlobString>,]> |                                              |
| INFO          | BlobString                                                                                                  | VerbatimString                               |
| MEMORY DOCTOR | BlobString                                                                                                  | VerbatimString                               |

### Sentinel
| Command             | RESP2 Reply | RESP3 Reply |
|---------------------|-------------|-------------|
| SENTINEL CONFIG GET | Array       | Map         |

### String
| Command | RESP2 Reply | RESP3 Reply |
|---------|-------------|-------------|
| LCS IDX | Array       | Map         |

### Set
| Command                                                              | RESP2 Reply | RESP3 Reply |
|----------------------------------------------------------------------|-------------|-------------|
| SINTER <br/>SPOP COUNT<br/>SMEMBERS<br/>SRANDMEMBER COUNT<br/>SUNION | Array       | Set         |

### Sorted set
| Command                  | RESP2 Reply                                                 | RESP3 Reply                                             |
|--------------------------|-------------------------------------------------------------|---------------------------------------------------------|
| ZADD INCR                | BlobString                                                  | Double                                                  |
| ZDIFF WITHSCORES         | Array\<BlobString>                                          | Array<\[BlobString, Double]>                            |
| ZINCRBY                  | BlobString                                                  | Double                                                  |
| ZINTER WITHSCORES        | Array\<BlobString>                                          | Array<\[BlobString, Double]>                            |
| ZMPOP                    | null &#124; \[BlobString, Array<\[BlobString, BlobString]>] | null &#124; \[BlobString, Array<\[BlobString, Double]>] |
| ZMSCORE                  | Array\<null &#124; BlobString>                              | Array\<null &#124; Double>                              |
| ZRANDMEMBER WITHSCORES   | Array\<BlobString>                                          | Array<\[BlobString, Double]>                            |
| ZSCORE                   | BlobString                                                  | Double                                                  |
| ZUNION WITHSCORES        | Array\<BlobString>                                          | Array<\[BlobString, Double]>                            |
| ZRANK WITHSCORE          | \[number, BlobString]                                       | \[number, Double]                                       |
| ZREVRANK WITHSCORE       | \[number, BlobString]                                       | \[number, Double]                                       |
| ZRANGE WITHSCORES        | Array\<BlobString>                                          | Array<\[BlobString, Double]                             |
| ZRANGEBYSCORE WITHSCORES | Array\<BlobString>                                          | Array<\[BlobString, Double]                             |
| ZMPOP                    | \[BlobString, Array<\[BlobString, BlobString]>]             | \[BlobString, Array<\[BlobString, Double]>]             |
| BZPOPMAX                 | null &#124; \[BlobString, BlobString, BlobString]           | null &#124; \[BlobString, BlobString, Double]           |
| BZPOPMIN                 | null &#124; \[BlobString, BlobString, BlobString]           | null &#124; \[BlobString, BlobString, Double]           |
| ZPOPMIN                  | null &#124; \[BlobString, BlobString]                       | null &#124; \[BlobString, Double]                       |
| ZPOPMIN COUNT            | null &#124; Array\<BlobString\>                             | null &#124; Array<\[BlobString, Double]>                |
| ZPOPMAX                  | null &#124; \[BlobString, BlobString]                       | null &#124; \[BlobString, Double]                       |
| ZPOPMAX COUNT            | null &#124; Array\<BlobString\>                             | null &#124; Array<\[BlobString, Double]>                |

### Stream
| Command         | RESP2 Reply                                                           | RESP3 Reply                                                       |
|-----------------|-----------------------------------------------------------------------|-------------------------------------------------------------------|
| XINFO CONSUMERS | Array                                                                 | Map                                                               |
| XINFO GROUPS    | Array                                                                 | Map                                                               |
| XINFO STREAM    | Array                                                                 | Map                                                               |
| XREAD           | Array<\[BlobString, \[BlobString, Array<\[BlobString, BlobString]>]]> | Map\<BlobString, \[BlobString, Array<\[BlobString, BlobString]>]> |
| XREADGROUP      | Array<\[BlobString, \[BlobString, Array<\[BlobString, BlobString]>]]> | Map\<BlobString, \[BlobString, Array<\[BlobString, BlobString]>]> |
