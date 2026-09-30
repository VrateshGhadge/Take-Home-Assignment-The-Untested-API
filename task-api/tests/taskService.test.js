const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});


describe('create', () => {
  test('happy path: creates a task with all fields', () => {
    const task = taskService.create({
      title: 'Write tests',
      description: 'cover service',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Write tests');
    expect(task.description).toBe('cover service');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2026-12-31T00:00:00.000Z');
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
  });

  test('edge: applies defaults when optional fields omitted', () => {
    const task = taskService.create({ title: 'Minimal' });

    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
  });

  test('edge: each task gets a unique id', () => {
    const a = taskService.create({ title: 'A' });
    const b = taskService.create({ title: 'B' });
    expect(a.id).not.toBe(b.id);
  });
});

describe('getAll / findById', () => {
  test('happy path: getAll returns created tasks', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    const all = taskService.getAll();
    expect(all).toHaveLength(2);
  });

  test('edge: getAll returns empty array when no tasks', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  test('edge: getAll returns a copy, mutating it does not affect store', () => {
    taskService.create({ title: 'A' });
    const all = taskService.getAll();
    all.push({ fake: true });
    expect(taskService.getAll()).toHaveLength(1);
  });

  test('happy path: findById returns the task', () => {
    const created = taskService.create({ title: 'Find me' });
    expect(taskService.findById(created.id)).toMatchObject({ title: 'Find me' });
  });

  test('edge: findById returns undefined for unknown id', () => {
    expect(taskService.findById('nope')).toBeUndefined();
  });
});

describe('getByStatus', () => {
  test('happy path: filters by exact status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });
    taskService.create({ title: 'C', status: 'in_progress' });

    expect(taskService.getByStatus('todo')).toHaveLength(1);
    expect(taskService.getByStatus('done')).toHaveLength(1);
    expect(taskService.getByStatus('in_progress')).toHaveLength(1);
  });

  test('edge: unknown status returns empty array', () => {
    taskService.create({ title: 'A', status: 'todo' });
    expect(taskService.getByStatus('archived')).toEqual([]);
  });

  test('edge: partial status string must not match (exact match only)', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });
    expect(taskService.getByStatus('do')).toEqual([]);
    expect(taskService.getByStatus('todo!')).toEqual([]);
  });
});

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 15; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  test('happy path: page 1 returns first N tasks', () => {
    const page = taskService.getPaginated(1, 10);
    expect(page).toHaveLength(10);
    expect(page[0].title).toBe('Task 1');
    expect(page[9].title).toBe('Task 10');
  });

  test('edge: page 2 returns remaining tasks', () => {
    const page = taskService.getPaginated(2, 10);
    expect(page).toHaveLength(5);
    expect(page[0].title).toBe('Task 11');
  });

  test('edge: out-of-range page returns empty array', () => {
    expect(taskService.getPaginated(5, 10)).toEqual([]);
  });
});

describe('update', () => {
  test('happy path: updates fields and returns updated task', () => {
    const created = taskService.create({ title: 'Old', priority: 'low' });
    const updated = taskService.update(created.id, { title: 'New', priority: 'high' });

    expect(updated.title).toBe('New');
    expect(updated.priority).toBe('high');
    expect(updated.id).toBe(created.id);
    expect(taskService.findById(created.id).title).toBe('New');
  });

  test('edge: returns null for unknown id', () => {
    expect(taskService.update('missing', { title: 'x' })).toBeNull();
  });

  test('edge: partial update preserves untouched fields', () => {
    const created = taskService.create({ title: 'Keep', description: 'orig', priority: 'low' });
    const updated = taskService.update(created.id, { title: 'Changed' });
    expect(updated.description).toBe('orig');
    expect(updated.priority).toBe('low');
  });
});

describe('remove', () => {
  test('happy path: removes task and returns true', () => {
    const created = taskService.create({ title: 'Gone' });
    expect(taskService.remove(created.id)).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  test('edge: returns false for unknown id', () => {
    expect(taskService.remove('missing')).toBe(false);
  });

  test('edge: only removes the targeted task', () => {
    const a = taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    taskService.remove(a.id);
    const remaining = taskService.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].title).toBe('B');
  });
});

describe('completeTask', () => {
  test('happy path: marks todo task as done with completedAt', () => {
    const created = taskService.create({ title: 'Do it', status: 'todo' });
    const done = taskService.completeTask(created.id);

    expect(done.status).toBe('done');
    expect(done.completedAt).toBeDefined();
    expect(new Date(done.completedAt).toString()).not.toBe('Invalid Date');
  });

  test('edge: preserves the original priority', () => {
    const created = taskService.create({ title: 'Urgent', priority: 'high' });
    const done = taskService.completeTask(created.id);
    expect(done.priority).toBe('high');
  });

  test('edge: returns null for unknown id', () => {
    expect(taskService.completeTask('missing')).toBeNull();
  });
});

describe('getStats', () => {
  test('happy path: counts tasks by status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'in_progress' });
    taskService.create({ title: 'D', status: 'done' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  test('edge: empty store returns zeros', () => {
    expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('edge: overdue counts non-done tasks with past dueDate only', () => {
    taskService.create({ title: 'Overdue', status: 'todo', dueDate: '2020-01-01T00:00:00.000Z' });
    taskService.create({ title: 'Future', status: 'todo', dueDate: '2030-01-01T00:00:00.000Z' });
    taskService.create({ title: 'Done late', status: 'done', dueDate: '2020-01-01T00:00:00.000Z' });
    taskService.create({ title: 'No date', status: 'todo' });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1);
  });
});
