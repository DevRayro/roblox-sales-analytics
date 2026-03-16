export class ApiBatcher<T, R> {
  private queue: { id: T; resolve: (value: R | null) => void; reject: (reason?: any) => void }[] = [];
  private timeout: number | null = null;
  private batchSize: number;
  private delayMs: number;
  private fetchFn: (ids: T[]) => Promise<Record<string, R>>;

  constructor(
    fetchFn: (ids: T[]) => Promise<Record<string, R>>,
    batchSize: number = 50,
    delayMs: number = 50
  ) {
    this.fetchFn = fetchFn;
    this.batchSize = batchSize;
    this.delayMs = delayMs;
  }

  async fetch(id: T): Promise<R | null> {
    return new Promise((resolve, reject) => {
      this.queue.push({ id, resolve, reject });
      
      if (!this.timeout) {
        this.timeout = window.setTimeout(() => this.processQueue(), this.delayMs);
      }
      
      if (this.queue.length >= this.batchSize) {
        if (this.timeout) {
          window.clearTimeout(this.timeout);
          this.timeout = null;
        }
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    this.timeout = null;
    if (this.queue.length === 0) return;

    const currentBatch = this.queue.splice(0, this.batchSize);
    const ids = Array.from(new Set(currentBatch.map(item => item.id)));

    try {
      const results = await this.fetchFn(ids);
      
      currentBatch.forEach(item => {
        const result = results[String(item.id)];
        item.resolve(result !== undefined ? result : null);
      });
    } catch (error) {
      currentBatch.forEach(item => item.reject(error));
    }

    if (this.queue.length > 0) {
      this.timeout = window.setTimeout(() => this.processQueue(), this.delayMs);
    }
  }
}

// Singleton instances for different API endpoints
export const userHeadshotBatcher = new ApiBatcher<string, string>(async (ids) => {
  try {
    const res = await fetch(`/api/roblox/thumbnails/users?userIds=${ids.join(',')}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    const result: Record<string, string> = {};
    if (data && data.data) {
      data.data.forEach((item: any) => {
        result[item.targetId.toString()] = item.imageUrl;
      });
    }
    return result;
  } catch (e) {
    console.error('Batch fetch error (headshots):', e);
    return {};
  }
});

export const userNameBatcher = new ApiBatcher<string, string>(async (ids) => {
  try {
    const res = await fetch(`/api/roblox/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: ids.map(id => parseInt(id)) })
    });
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    const result: Record<string, string> = {};
    if (data && data.data) {
      data.data.forEach((item: any) => {
        result[item.id.toString()] = item.name;
      });
    }
    return result;
  } catch (e) {
    console.error('Batch fetch error (usernames):', e);
    return {};
  }
});

export const gameIconBatcher = new ApiBatcher<string, string>(async (ids) => {
  try {
    const res = await fetch(`/api/roblox/thumbnails/games?universeIds=${ids.join(',')}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    const result: Record<string, string> = {};
    if (data && data.data) {
      data.data.forEach((item: any) => {
        result[item.targetId.toString()] = item.imageUrl;
      });
    }
    return result;
  } catch (e) {
    console.error('Batch fetch error (game icons):', e);
    return {};
  }
});

export const placeIconBatcher = new ApiBatcher<string, string>(async (ids) => {
  try {
    const res = await fetch(`/api/roblox/thumbnails/places?placeIds=${ids.join(',')}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    const result: Record<string, string> = {};
    if (data && data.data) {
      data.data.forEach((item: any) => {
        result[item.targetId.toString()] = item.imageUrl;
      });
    }
    return result;
  } catch (e) {
    console.error('Batch fetch error (place icons):', e);
    return {};
  }
});

export const gameNameBatcher = new ApiBatcher<string, string>(async (ids) => {
  try {
    const res = await fetch(`/api/roblox/games?universeIds=${ids.join(',')}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    const result: Record<string, string> = {};
    if (data && data.data) {
      data.data.forEach((item: any) => {
        result[item.id.toString()] = item.name;
      });
    }
    return result;
  } catch (e) {
    console.error('Batch fetch error (game names):', e);
    return {};
  }
});
