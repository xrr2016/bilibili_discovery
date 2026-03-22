export class AsyncTaskCache<K, V> {
  private tasks = new Map<K, Promise<V>>();

  getOrCreate(key: K, factory: () => Promise<V>): Promise<V> {
    const existing = this.tasks.get(key);
    if (existing) return existing;

    const task = factory().finally(() => {
      this.tasks.delete(key);
    });

    this.tasks.set(key, task);
    return task;
  }
}