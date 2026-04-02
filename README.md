# Task Manager API — Take-Home Submission

## What I did
- Read the source, wrote **57 tests** (unit + integration) hitting **96% coverage**
- Found and fixed **4 bugs** (documented in `BUG_REPORT.md`)
- Implemented `PATCH /tasks/:id/assign` with validation and tests

## How to run
```bash
cd task-api
npm install
npm test
npm run coverage
```

## Key files
- `BUG_REPORT.md` — bugs found, root causes, fixes applied
- `SUBMISSION.md` — coverage output, design notes, questions
- `task-api/tests/` — all tests
- `task-api/src/services/taskService.js` — core logic, bug fixes, and new features

---

## Original API Reference

| Method   | Path                      | Description                              |
|----------|---------------------------|------------------------------------------|
| `GET`    | `/tasks`                  | List all tasks. Supports `?status=`, `?page=`, `?limit=` |
| `POST`   | `/tasks`                  | Create a new task                        |
| `PUT`    | `/tasks/:id`              | Full update of a task                    |
| `DELETE` | `/tasks/:id`              | Delete a task (returns 204)              |
| `PATCH`  | `/tasks/:id/complete`     | Mark a task as complete                  |
| `GET`    | `/tasks/stats`            | Counts by status + overdue count         |
| `PATCH`  | `/tasks/:id/assign`       | **Assign a task to a user** _(implemented)_ |
