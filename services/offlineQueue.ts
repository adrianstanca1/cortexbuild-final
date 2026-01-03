
import { db } from './db';

export interface QueuedAction {
  id: string;
  type: 'ADD_TASK' | 'UPDATE_TASK' | 'ADD_LOG' | 'SYNC';
  payload: any;
  timestamp: number;
}

class OfflineQueueService {
  private queue: QueuedAction[] = [];
  private storageKey = 'buildpro_offline_queue';

  constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => this.processQueue());
    }
  }

  private loadQueue() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.queue = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse offline queue", e);
        this.queue = [];
      }
    }
  }

  private saveQueue() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
  }

  public enqueue(type: QueuedAction['type'], payload: any) {
    const action: QueuedAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now()
    };
    this.queue.push(action);
    this.saveQueue();
    console.log(`[Offline] Action queued: ${type}`);
  }

  public async processQueue() {
    if (!navigator.onLine || this.queue.length === 0) return;

    console.log(`[Offline] Processing ${this.queue.length} actions...`);
    const actions = [...this.queue];
    
    // Optimistic clear, will re-queue on failure
    this.queue = []; 
    this.saveQueue();

    for (const action of actions) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error(`[Offline] Failed to sync action ${action.id}`, error);
        // Re-queue if failed (simple retry strategy)
        this.queue.push(action);
        this.saveQueue();
      }
    }
  }

  private async executeAction(action: QueuedAction) {
    // Map queue actions to DB calls
    switch (action.type) {
      case 'ADD_TASK':
        await db.addTask(action.payload);
        break;
      case 'UPDATE_TASK':
        await db.updateTask(action.payload.id, action.payload.updates);
        break;
      case 'ADD_LOG':
        console.log("Syncing log:", action.payload);
        break;
      default:
        console.warn("Unknown action type:", action.type);
    }
  }

  public getQueueSize(): number {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueueService();
