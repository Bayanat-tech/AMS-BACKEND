import logger from '../../utils/logger';

interface CacheItem {
  value: any;
  expiresAt: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheItem> = new Map();
  private pendingConfirmations: Map<string, any> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired items every minute
    // this.cleanupInterval = setInterval(() => {
    //   this.cleanupExpired();
    // }, 60000);
    this.cleanupInterval = setInterval(() => {
       this.cleanupExpired();
    }, 60000) as unknown as NodeJS.Timeout;
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Memory store for pending confirmations
  setMemory(key: string, value: any, ttl?: number): void {
    this.pendingConfirmations.set(key, value);
    if (ttl) {
      setTimeout(() => this.pendingConfirmations.delete(key), ttl);
    }
  }

  getMemory(key: string): any {
    return this.pendingConfirmations.get(key);
  }

  deleteMemory(key: string): boolean {
    return this.pendingConfirmations.delete(key);
  }

  // General cache with TTL
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    const expiresAt = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  getPendingConfirmationsCount(): number {
    return this.pendingConfirmations.size;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) this.cache.delete(key);
    }
  }
}