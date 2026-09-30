const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('GET /tasks', () => {
  test('happy path: returns empty array when no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('happy path: returns all created tasks', async () => {
    await request(app).post('/tasks').send({ title: 'A' });
    await request(app).post('/tasks').send({ title: 'B' });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('happy path: filters by exact status', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'done' });

    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('A');
  });

  test('edge: partial status must not match anything', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'done' });

    const res = await request(app).get('/tasks?status=do');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('edge: unknown status returns empty array', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });

    const res = await request(app).get('/tasks?status=archived');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /tasks paginated', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}` });
    }
  });

  test('happy path: page 1 returns first N tasks', async () => {
    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 1');
    expect(res.body[1].title).toBe('Task 2');
  });

  test('edge: page 2 returns next N tasks', async () => {
    const res = await request(app).get('/tasks?page=2&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 3');
    expect(res.body[1].title).toBe('Task 4');
  });

  test('edge: out-of-range page returns empty array', async () => {
    const res = await request(app).get('/tasks?page=99&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /tasks', () => {
  test('happy path: creates task and returns 201', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Write tests', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Write tests');
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('todo');
  });

  test('edge: missing title returns 400', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'high' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('edge: blank title returns 400', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  test('edge: invalid status returns 400', async () => {
    const res = await request(app).post('/tasks').send({ title: 'A', status: 'archived' });
    expect(res.status).toBe(400);
  });

  test('edge: invalid priority returns 400', async () => {
    const res = await request(app).post('/tasks').send({ title: 'A', priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  test('edge: invalid dueDate returns 400', async () => {
    const res = await request(app).post('/tasks').send({ title: 'A', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /tasks/:id', () => {
  test('happy path: updates task and returns 200', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Old' });

    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: 'New', priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
    expect(res.body.priority).toBe('high');
  });

  test('edge: unknown id returns 404', async () => {
    const res = await request(app).put('/tasks/does-not-exist').send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  test('edge: invalid status returns 400', async () => {
    const created = await request(app).post('/tasks').send({ title: 'A' });

    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ status: 'archived' });

    expect(res.status).toBe(400);
  });

  test('edge: blank title returns 400', async () => {
    const created = await request(app).post('/tasks').send({ title: 'A' });

    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('happy path: deletes task and returns 204', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Gone' });

    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(204);

    const list = await request(app).get('/tasks');
    expect(list.body).toHaveLength(0);
  });

  test('edge: unknown id returns 404', async () => {
    const res = await request(app).delete('/tasks/does-not-exist');
    expect(res.status).toBe(404);
  });

  test('edge: deleting twice returns 404 the second time', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Twice' });

    await request(app).delete(`/tasks/${created.body.id}`);
    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('happy path: marks task done and returns updated task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Do it' });

    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeDefined();
  });

  test('edge: preserves the original priority', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({ title: 'Urgent', priority: 'high' });

    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
  });

  test('edge: unknown id returns 404', async () => {
    const res = await request(app).patch('/tasks/does-not-exist/complete');
    expect(res.status).toBe(404);
  });
});

describe('GET /tasks/stats', () => {
  test('happy path: returns counts by status', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'in_progress' });
    await request(app).post('/tasks').send({ title: 'C', status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(1);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  test('edge: empty store returns zeros', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('edge: overdue counts only non-done tasks with past dueDate', async () => {
    await request(app).post('/tasks').send({ title: 'Overdue', dueDate: '2020-01-01T00:00:00.000Z' });
    await request(app).post('/tasks').send({ title: 'Future', dueDate: '2030-01-01T00:00:00.000Z' });

    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.overdue).toBe(1);
  });
});
