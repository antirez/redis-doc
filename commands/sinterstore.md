This command is equal to `SINTER`, but instead of returning the resulting set,
it is stored in `destination`.

If `destination` already exists, it is overwritten (when the intersection is nonempty) or deleted (when the intersection is empty).

@examples

```cli
SADD key1 "a"
SADD key1 "b"
SADD key1 "c"
SADD key2 "c"
SADD key2 "d"
SADD key2 "e"
SINTERSTORE key key1 key2
SMEMBERS key
```
