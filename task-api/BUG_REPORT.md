# Bug report

All three of these popped up when I ran my Day 1 tests. I wasn't really looking for bugs at first, I just wrote what I thought the endpoints should do and then jest started failing.

### 1. Filtering by status matches parts of words

This one lives in `src/services/taskService.js` in `getByStatus` (around line 9). It's doing:

`tasks.filter((t) => t.status.includes(status))`

So it's a substring check, not an exact check.

What I expected: `GET /tasks?status=do` should give back nothing, since `do` isn't a real status.

What actually happens: you get back both `todo` and `done` tasks, because `"todo".includes("do")` is true. My test expected `[]` and got 2 tasks instead, took me a second to figure out why.

Fix is pretty simple, just change it to `===`:

`tasks.filter((t) => t.status === status)`

I left this one as-is since i only fixed one bug, but this is the fix I would go with.

### 2. Pagination is off by one page (I fixed this one)

This is in `getPaginated` in the same file, lines 11-14. The offset math was:

`const offset = page * limit;`

What I expected: `GET /tasks?page=1&limit=2` should return Task 1 and Task 2.

What actually happens: it returns Task 3 and Task 4. Since page 1 gives offset 2, you always skip the first page. Page 2 test also failed for the same reason, it only returned 1 item instead of 2.

I found it because both my unit test and my route test for page 1 failed with "expected Task 1, got Task 3".

Fix: `const offset = (page - 1) * limit;` — that's what I changed, and those pagination tests pass now.

### 3. Completing a task wipes out its priority

This is in `completeTask` (around line 63-77). The update object has a hardcoded `priority: 'medium'` in it, so whatever priority the task had gets overwritten.

What i expected: if i make a `high` priority task and then mark it complete, it should still say `high`.

What actually happens: it comes back as `medium` every time. My test said expected "high", received "medium".

Fix would be to just delete that `priority: 'medium'` line and let the spread keep the old value. Only `status` and `completedAt` should change there.
