# Submission Notes

## Coverage Report

```
-----------------------------|---------|----------|---------|---------|-------------------
File                         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------------|---------|----------|---------|---------|-------------------
All files                    |   96.05 |    91.66 |   93.10 |   95.65 |
 src                         |   69.23 |       75 |       0 |   69.23 |
  app.js                     |   69.23 |       75 |       0 |   69.23 | 10-11,17-18
 src/routes                  |     100 |    92.59 |     100 |     100 |
  tasks.js                   |     100 |    92.59 |     100 |     100 | 20-21
 src/services                |     100 |    94.73 |     100 |     100 |
  taskService.js             |     100 |    94.73 |     100 |     100 | 22
 src/utils                   |    91.3 |    91.17 |     100 |    91.3 |
  validators.js              |    91.3 |    91.17 |     100 |    91.3 | 28,31
-----------------------------|---------|----------|---------|---------|-------------------

Tests: 57 passed, 0 failed
Test Suites: 2 passed
```

## What I'd Test Next

- **Concurrent access:** The in-memory store has no locking. Simultaneous requests could cause race conditions (e.g., two updates to the same task).
- **Input sanitization:** Test extremely long strings, special characters, and potential XSS/NoSQL injection payloads in title/description/assignee.
- **Date edge cases:** Tasks with due dates exactly at "now," timezone handling across different server locales, and leap-second boundaries.
- **Rate limiting and large payloads:** What happens when thousands of tasks are created? Pagination performance and memory behavior under load.
- **Error handler coverage:** Trigger the global Express error handler to verify it returns 500 correctly.

## What Surprised Me

- **`completeTask` silently resets priority to `medium`** — this is a subtle data-loss bug that wouldn't be caught without testing. It looks like a copy-paste artifact; the `priority: 'medium'` line was probably left from a template/default object.
- **`getByStatus` using `.includes()` on strings** — a classic mistake where JavaScript's `String.prototype.includes()` does substring matching rather than exact equality. This would cause phantom results in production.
- **No input protection on `update`** — the spread pattern is idiomatic but dangerous when it allows callers to overwrite `id` or `createdAt`.

## Questions Before Shipping to Production

1. **Should there be authentication/authorization?** Currently, any client can create, modify, or delete any task.
2. **Should completed tasks be immutable?** Right now you can update or reassign a task after marking it done.
3. **What's the persistence strategy?** The in-memory store means all data is lost on restart. Is a database migration planned?
4. **Are there any constraints on `assignee`?** Should it map to known users, or is any free-text string acceptable?
5. **What are the expected SLAs?** This affects whether we need request timeouts, connection pooling, or caching.

## Design Decisions for `PATCH /tasks/:id/assign`

- **Reassignment is allowed** — if a task already has an assignee, calling assign again overwrites it. This is the simplest UX and avoids a separate "unassign" endpoint.
- **Whitespace is trimmed** — `" Alice "` becomes `"Alice"` to prevent accidental invisible-character issues.
- **Validation rejects non-strings and empty strings** — returns a clear 400 error message. Numbers, null, and blank strings are all rejected.
