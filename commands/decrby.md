The `DECRBY` command reduces the value stored at the specified `key` by the specified `decrement`.
If the key does not exist, it is initialized with a value of `0` before performing the operation.
If the key's value is not of the correct type or cannot be represented as an integer, an error is returned.
This operation is limited to **64-bit** signed integers.

See `INCR` for extra information on increment/decrement operations.

@examples

```cli
SET mykey "10"
DECRBY mykey 3
```
