const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('assignTask (unit)', () => {
  test('happy path: assigns an unassigned task', () => {
    const created = taskService.create({ title: 'Task' });
    expect(created.assignee).toBeNull();

    const updated = taskService.assignTask(created.id, 'Alice');
    expect(updated.assignee).toBe('Alice');
    expect(taskService.findById(created.id).assignee).toBe('Alice');
  });

  test('happy path: trims surrounding whitespace', () => {
    const created = taskService.create({ title: 'Task' });
    const updated = taskService.assignTask(created.id, '  Bob  ');
    expect(updated.assignee).toBe('Bob');
  });

  test('edge: unknown id returns null', () => {
    expect(taskService.assignTask('missing', 'Alice')).toBeNull();
  });

  test('edge: empty string returns validation error', () => {
    const created = taskService.create({ title: 'Task' });
    expect(taskService.assignTask(created.id, '')).toEqual({ error: 'validation' });
    expect(taskService.assignTask(created.id, '   ')).toEqual({ error: 'validation' });
  });

  test('edge: missing / non-string assignee returns validation error', () => {
    const created = taskService.create({ title: 'Task' });
    expect(taskService.assignTask(created.id, undefined)).toEqual({ error: 'validation' });
    expect(taskService.assignTask(created.id, 123)).toEqual({ error: 'validation' });
  });

  test('edge: already-assigned task returns conflict error', () => {
    const created = taskService.create({ title: 'Task' });
    taskService.assignTask(created.id, 'Alice');
    expect(taskService.assignTask(created.id, 'Bob')).toEqual({ error: 'conflict' });
    expect(taskService.findById(created.id).assignee).toBe('Alice');
  });
});

describe('PATCH /tasks/:id/assign', () => {
  test('happy path: assigns task and returns 200 with updated task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Task' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.id).toBe(created.body.id);
  });

  test('edge: unknown id returns 404', async () => {
    const res = await request(app)
      .patch('/tasks/does-not-exist/assign')
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(404);
  });

  test('edge: empty string returns 400', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Task' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '' });

    expect(res.status).toBe(400);
  });

  test('edge: missing assignee returns 400', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Task' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
  });

  test('edge: re-assigning an assigned task returns 409', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Task' });
    await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(409);
  });
});
