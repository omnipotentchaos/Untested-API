const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─── create ──────────────────────────────────────────────────────────────────

describe('create', () => {
  it('should create a task with required fields and correct defaults', () => {
    const task = taskService.create({ title: 'Test task' });

    expect(task).toMatchObject({
      title: 'Test task',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  it('should accept all optional fields', () => {
    const task = taskService.create({
      title: 'Full task',
      description: 'A description',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2025-12-31T00:00:00.000Z',
    });

    expect(task.description).toBe('A description');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2025-12-31T00:00:00.000Z');
  });

  it('should generate unique IDs for each task', () => {
    const t1 = taskService.create({ title: 'Task 1' });
    const t2 = taskService.create({ title: 'Task 2' });
    expect(t1.id).not.toBe(t2.id);
  });
});

// ─── getAll ──────────────────────────────────────────────────────────────────

describe('getAll', () => {
  it('should return an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('should return all created tasks', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    const all = taskService.getAll();
    expect(all).toHaveLength(2);
  });

  it('should return a copy (not the original array)', () => {
    taskService.create({ title: 'A' });
    const all = taskService.getAll();
    all.push({ title: 'injected' });
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// ─── findById ────────────────────────────────────────────────────────────────

describe('findById', () => {
  it('should find a task by its id', () => {
    const created = taskService.create({ title: 'Find me' });
    const found = taskService.findById(created.id);
    expect(found).toEqual(created);
  });

  it('should return undefined for a non-existent id', () => {
    expect(taskService.findById('nonexistent')).toBeUndefined();
  });
});

// ─── getByStatus ─────────────────────────────────────────────────────────────

describe('getByStatus', () => {
  beforeEach(() => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'Done task', status: 'done' });
    taskService.create({ title: 'In progress', status: 'in_progress' });
  });

  it('should return tasks matching the given status', () => {
    const todos = taskService.getByStatus('todo');
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Todo task');
  });

  it('should return empty array when no tasks match', () => {
    taskService._reset();
    taskService.create({ title: 'Only todo', status: 'todo' });
    expect(taskService.getByStatus('done')).toHaveLength(0);
  });

  // BUG: getByStatus uses status.includes() which is a substring match
  // For example, status "do" would match "done" because "done".includes("do") === true
  it('BUG: substring matching — "do" incorrectly matches "done"', () => {
    const results = taskService.getByStatus('do');
    // This SHOULD return 0 results (no task has status "do"),
    // but due to the .includes() bug it returns tasks with status "done"
    expect(results.length).toBeGreaterThan(0); // confirms the bug exists
  });

  // BUG: "in_" would match "in_progress"
  it('BUG: substring matching — "in_" incorrectly matches "in_progress"', () => {
    const results = taskService.getByStatus('in_');
    expect(results.length).toBeGreaterThan(0); // confirms the bug exists
  });
});

// ─── getPaginated ────────────────────────────────────────────────────────────

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 15; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  // FIXED: offset was page * limit, now correctly (page - 1) * limit
  it('should return the first page of results', () => {
    const page1 = taskService.getPaginated(1, 10);
    expect(page1).toHaveLength(10);
    expect(page1[0].title).toBe('Task 1');
    expect(page1[9].title).toBe('Task 10');
  });

  it('should return the second page of results', () => {
    const page2 = taskService.getPaginated(2, 5);
    expect(page2).toHaveLength(5);
    expect(page2[0].title).toBe('Task 6');
  });

  it('should return empty array for a page beyond the data', () => {
    const result = taskService.getPaginated(100, 10);
    expect(result).toEqual([]);
  });
});

// ─── getStats ────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('should return zero counts when no tasks exist', () => {
    expect(taskService.getStats()).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    });
  });

  it('should count tasks by status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'in_progress' });
    taskService.create({ title: 'D', status: 'done' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('should count overdue tasks (past dueDate, not done)', () => {
    taskService.create({
      title: 'Overdue',
      status: 'todo',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    taskService.create({
      title: 'Not overdue - done',
      status: 'done',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    taskService.create({
      title: 'Not overdue - future',
      status: 'todo',
      dueDate: '2099-01-01T00:00:00.000Z',
    });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1);
  });
});

// ─── update ──────────────────────────────────────────────────────────────────

describe('update', () => {
  it('should update specified fields on an existing task', () => {
    const task = taskService.create({ title: 'Original' });
    const updated = taskService.update(task.id, { title: 'Updated', priority: 'high' });

    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
    expect(updated.id).toBe(task.id); // id unchanged
  });

  it('should return null for a non-existent task', () => {
    expect(taskService.update('nonexistent', { title: 'X' })).toBeNull();
  });

  it('should preserve fields not included in the update', () => {
    const task = taskService.create({ title: 'Keep me', priority: 'high' });
    const updated = taskService.update(task.id, { description: 'Added' });

    expect(updated.title).toBe('Keep me');
    expect(updated.priority).toBe('high');
    expect(updated.description).toBe('Added');
  });

  // BUG: update allows overwriting protected fields like id and createdAt
  it('BUG: allows overwriting id via spread', () => {
    const task = taskService.create({ title: 'Test' });
    const originalId = task.id;
    const updated = taskService.update(originalId, { id: 'hacked-id' });

    expect(updated.id).toBe('hacked-id'); // confirms the bug: id was overwritten
    // After this, findById with the original id would fail:
    expect(taskService.findById(originalId)).toBeUndefined();
  });
});

// ─── remove ──────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('should remove an existing task and return true', () => {
    const task = taskService.create({ title: 'Delete me' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  it('should return false for a non-existent task', () => {
    expect(taskService.remove('nonexistent')).toBe(false);
  });
});

// ─── completeTask ────────────────────────────────────────────────────────────

describe('completeTask', () => {
  it('should set status to done and add completedAt timestamp', () => {
    const task = taskService.create({ title: 'Complete me', status: 'todo' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
    expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
  });

  it('should return null for a non-existent task', () => {
    expect(taskService.completeTask('nonexistent')).toBeNull();
  });

  // BUG: completeTask resets priority to 'medium' regardless of original value
  it('BUG: resets priority to medium on completion', () => {
    const task = taskService.create({ title: 'High priority', priority: 'high' });
    const completed = taskService.completeTask(task.id);

    // Should preserve 'high', but bug forces it to 'medium'
    expect(completed.priority).toBe('medium'); // confirms the bug
  });

  it('should update the task in the store', () => {
    const task = taskService.create({ title: 'Persist check' });
    taskService.completeTask(task.id);
    const found = taskService.findById(task.id);
    expect(found.status).toBe('done');
  });
});
