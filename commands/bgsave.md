

Save the DB in background. The OK code is immediately returned.
Redis forks, the parent continues to serve the clients, the child
saves the DB on disk then exits. A client my be able to check if the
operation succeeded using the `LASTSAVE` command.

Please refer to the [persistence documentation](/topics/persistence) for detailed information.

@return

@status-reply
