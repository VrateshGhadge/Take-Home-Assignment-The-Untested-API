# Submission note

### If I had more time, what I'd test next

Honestly the first thing i would look at is the `PUT` endpoint. Right now `update()` just spreads whatever you send onto the task, so you could overwrite `id` or `createdAt` if you wanted. I'd add tests for that and probably lock down which fields are allowed.

I would also throw some garbage at the pagination params, like `?page=abc` or `?limit=-5`, just to see what happens. And concurrent edits to the same task, since it's all in-memory there's no locking at all.

### What surprised me

 Mostly how much damage a one liner can do. All three bugs were a single line each. The `includes` vs `===` one especially, it looks fine at a glance until you actually test it with a partial string.

Also noticed `GET /tasks` can't do status + pagination together. If you pass both, status wins and page/limit just get ignored. Not really a bug but worth deciding what it should do.

### Stuff I'd ask before shipping

- Is in memory storage actually okay? Everything disappears on restart, so I am guessing a real DB is planned but I would want to confirm.
- Are there rules for status changes? Like can a `done` task go back to `todo`, or should that be blocked?
- Do we need any auth on this at all? Right now anyone can create or delete anything, which feels risky for prod.
