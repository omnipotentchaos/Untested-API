# Bug Report

| # | Location | Bug | Fixed? |
|---|----------|-----|--------|
| 1 | `taskService.js:9` | `getByStatus` uses substring match | ✅ Yes |
| 2 | `taskService.js:12` | Pagination offset off-by-one | ✅ Yes |
| 3 | `taskService.js:69` | `completeTask` resets priority to `'medium'` | ✅ Yes |
| 4 | `taskService.js:50` | `update` allows overwriting `id`/`createdAt` | ✅ Yes |

---

## Bug 1: `getByStatus` Uses Substring Matching Instead of Exact Match

**Location:** `src/services/taskService.js`, line 9

**Expected behavior:** Filtering by status should return only tasks whose status *exactly* matches the query parameter (e.g., `?status=done` returns only `done` tasks).

**Actual behavior:** The code uses `t.status.includes(status)`, which performs a *substring* match. This means `?status=do` matches tasks with status `done`, and `?status=in_` matches `in_progress`.

**How discovered:** Unit testing `getByStatus('do')` — it incorrectly returned tasks with status `done`.

**Suggested fix:** Replace `t.status.includes(status)` with `t.status === status` on line 9.

**Fix applied:** Changed `.includes()` to `===` for exact status matching.

---

## Bug 2: `getPaginated` Has Off-By-One Error in Offset Calculation

**Location:** `src/services/taskService.js`, line 12

**Expected behavior:** Page 1 should return the first `limit` items (offset 0). Page 2 should return items starting at offset `limit`.

**Actual behavior:** The offset is calculated as `page * limit` instead of `(page - 1) * limit`. This means page 1 starts at `offset = limit`, skipping the entire first page of data.

**How discovered:** Integration test for `GET /tasks?page=1&limit=10` with 15 tasks — expected 10 results on page 1 but got 5 (items 11-15).

**Fix applied:** Changed `const offset = page * limit` to `const offset = (page - 1) * limit`.

---

## Bug 3: `completeTask` Resets Priority to `'medium'`

**Location:** `src/services/taskService.js`, line 69

**Expected behavior:** Marking a task as complete should only change `status` to `done` and set `completedAt`. All other fields (including `priority`) should be preserved.

**Actual behavior:** The `completeTask` function spreads the task and then explicitly sets `priority: 'medium'`, overwriting whatever the original priority was. A high-priority task becomes medium-priority upon completion.

**How discovered:** Unit test creating a task with `priority: 'high'`, completing it, and observing the priority was silently changed to `medium`.

**Suggested fix:** Remove `priority: 'medium'` from the spread object in `completeTask`.

**Fix applied:** Removed the `priority: 'medium'` line so the original priority is preserved.

---

## Bug 4: `update` Allows Overwriting Protected Fields (`id`, `createdAt`)

**Location:** `src/services/taskService.js`, line 50

**Expected behavior:** The `id` and `createdAt` fields should be immutable — they are set on creation and should never change.

**Actual behavior:** The update function uses `{ ...tasks[index], ...fields }`, which allows the caller to pass `{ id: 'new-id' }` and corrupt the task's identity. After such an update, the task can no longer be found by its original ID.

**How discovered:** Unit test that updates a task with `{ id: 'hacked-id' }` — the original ID lookup then returns `undefined`.

**Suggested fix:** Destructure `fields` to exclude protected properties before spreading:
```js
const { id: _, createdAt: __, ...safeFields } = fields;
const updated = { ...tasks[index], ...safeFields };
```

**Fix applied:** Added destructuring to strip `id` and `createdAt` before merging fields.
