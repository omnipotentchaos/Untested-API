/**
 * Integration tests for API routes
 * Hits endpoints via supertest: GET/POST/PUT/DELETE /tasks,
 * along with special /complete and /assign endpoints.
 *
 * Bug regression tests are marked with // FIXED:
 */

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// Helper to create a task via the API
const createTask = (overrides = {}) =>
  request(app)
    .post('/tasks')
    .send({ title: 'Default task', ...overrides });

// ─── POST /tasks ─────────────────────────────────────────────────────────────

describe('POST /tasks', () => {
  it('should create a task and return 201', async () => {
    const res = await createTask({ title: 'New task', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('todo');
  });

  it('should return 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 when title is an empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('should return 400 for an invalid status', async () => {
    const res = await createTask({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('should return 400 for an invalid priority', async () => {
    const res = await createTask({ priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  it('should return 400 for an invalid dueDate', async () => {
    const res = await createTask({ dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /tasks ──────────────────────────────────────────────────────────────

describe('GET /tasks', () => {
  it('should return an empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return all tasks', async () => {
    await createTask({ title: 'A' });
    await createTask({ title: 'B' });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('should filter by status', async () => {
    await createTask({ title: 'Todo', status: 'todo' });
    await createTask({ title: 'Done', status: 'done' });

    const res = await request(app).get('/tasks?status=done');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Done');
  });

  it('should paginate results', async () => {
    for (let i = 1; i <= 15; i++) {
      await createTask({ title: `Task ${i}` });
    }

    // FIXED: getPaginated offset now correct — page 1 returns first 10 items
    const res = await request(app).get('/tasks?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
  });
});

// ─── PUT /tasks/:id ──────────────────────────────────────────────────────────

describe('PUT /tasks/:id', () => {
  it('should update an existing task', async () => {
    const created = await createTask({ title: 'Original' });
    const id = created.body.id;

    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ title: 'Updated', priority: 'low' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.priority).toBe('low');
  });

  it('should return 404 for a non-existent task', async () => {
    const res = await request(app)
      .put('/tasks/nonexistent')
      .send({ title: 'Nope' });

    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid update fields', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
  });

  it('should return 400 if title is set to empty string', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /tasks/:id ───────────────────────────────────────────────────────

describe('DELETE /tasks/:id', () => {
  it('should delete a task and return 204', async () => {
    const created = await createTask();
    const res = await request(app).delete(`/tasks/${created.body.id}`);

    expect(res.status).toBe(204);

    // Confirm it's gone
    const getRes = await request(app).get('/tasks');
    expect(getRes.body).toHaveLength(0);
  });

  it('should return 404 for a non-existent task', async () => {
    const res = await request(app).delete('/tasks/nonexistent');
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /tasks/:id/complete ───────────────────────────────────────────────

describe('PATCH /tasks/:id/complete', () => {
  it('should mark a task as done', async () => {
    const created = await createTask({ status: 'todo' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeDefined();
  });

  it('should return 404 for a non-existent task', async () => {
    const res = await request(app).patch('/tasks/nonexistent/complete');
    expect(res.status).toBe(404);
  });

  // FIXED: priority is now preserved on completion
  it('should preserve priority on completion', async () => {
    const created = await createTask({ priority: 'high' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);

    expect(res.body.priority).toBe('high'); // was 'medium' before fix
  });
});

// ─── GET /tasks/stats ────────────────────────────────────────────────────────

describe('GET /tasks/stats', () => {
  it('should return zero counts when no tasks exist', async () => {
    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    });
  });

  it('should return correct counts by status', async () => {
    await createTask({ status: 'todo' });
    await createTask({ status: 'todo' });
    await createTask({ status: 'in_progress' });
    await createTask({ status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.todo).toBe(2);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  it('should count overdue tasks', async () => {
    await createTask({ status: 'todo', dueDate: '2020-01-01T00:00:00.000Z' });
    await createTask({ status: 'done', dueDate: '2020-01-01T00:00:00.000Z' });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });
});

// ─── PATCH /tasks/:id/assign ─────────────────────────────────────────────────

describe('PATCH /tasks/:id/assign', () => {
  it('should assign a task to a user', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  it('should allow reassignment', async () => {
    const created = await createTask();
    await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('should return 404 for a non-existent task', async () => {
    const res = await request(app)
      .patch('/tasks/nonexistent/assign')
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(404);
  });

  it('should return 400 when assignee is missing', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('should return 400 when assignee is an empty string', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '' });

    expect(res.status).toBe(400);
  });

  it('should return 400 when assignee is not a string', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 123 });

    expect(res.status).toBe(400);
  });

  it('should preserve the assignee field when fetching the task', async () => {
    const created = await createTask();
    await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Charlie' });

    const res = await request(app).get('/tasks');
    const task = res.body.find((t) => t.id === created.body.id);
    expect(task.assignee).toBe('Charlie');
  });
});
