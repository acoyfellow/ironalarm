/**
 * AgentDO: Example Durable Object using ironalarm
 * Simulates a long-running agent with checkpoints
 */
import { ReliableScheduler } from '../../dist/index.mjs';

export interface TaskStatus {
  taskId: string;
  taskName: string;
  status: string;
  progress: Record<string, any>;
  startedAt: number;
  completedAt?: number;
  evictionCount?: number;
  complexity?: string;
}

export class AgentDO implements DurableObject {
  private scheduler: ReliableScheduler;
  private taskStatuses: Map<string, TaskStatus> = new Map();

  constructor(state: DurableObjectState, env: any) {
    this.scheduler = new ReliableScheduler(state.storage);

    // Register agent-loop task with complexity support
    this.scheduler.register('agent-loop', async (sched, taskId, params) => {
      const complexity = params.complexity || 'demo';
      // 1s, 10s, demo: 60s, realistic: 1 hour, production: 1 week, month: 30 days, year: 365 days
      const durationMs = {
        '1s': 1000,
        '10s': 10000,
        demo: 60000,
        realistic: 3600000,
        production: 604800000,
        month: 2592000000,
        year: 31536000000
      }[complexity] || 60000;
      const stepCount = {
        '1s': 2,
        '10s': 3,
        demo: 5,
        realistic: 10,
        production: 20,
        month: 30,
        year: 50
      }[complexity] || 5;
      const stepDuration = Math.floor(durationMs / stepCount);

      console.log(`[${taskId}] Starting agent loop (${complexity}) with params:`, params);

      const steps = ['researching', 'analyzing', 'synthesizing', 'writing', 'finalizing'].slice(0, stepCount);

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const checkpointKey = `${step}_done`;
        const isDone = await sched.getCheckpoint(taskId, checkpointKey);

        if (!isDone) {
          console.log(`[${taskId}] Step ${i + 1}/${steps.length}: ${step}`);
          await this.updateStatus(taskId, {
            progress: {
              step,
              progress: `${Math.round((i / steps.length) * 100)}%`,
              checkpoints: Object.fromEntries(
                steps.slice(0, i).map(s => [s, 'done'])
              ),
              timestamp: new Date().toISOString()
            }
          });

          // Simulate work with sub-checkpoints for longer tasks
          if (complexity === 'production') {
            const subSteps = 5;
            for (let j = 0; j < subSteps; j++) {
              await new Promise(r => setTimeout(r, stepDuration / subSteps));
              await sched.checkpoint(taskId, `${checkpointKey}_substep_${j}`, true);
              await this.updateStatus(taskId, {
                progress: {
                  step: `${step} (${j + 1}/${subSteps})`,
                  progress: `${Math.round(((i + (j + 1) / subSteps) / steps.length) * 100)}%`,
                  checkpoints: Object.fromEntries(
                    steps.slice(0, i).map(s => [s, 'done'])
                  ),
                  timestamp: new Date().toISOString()
                }
              });
            }
          } else if (complexity === 'realistic') {
            const subSteps = 3;
            for (let j = 0; j < subSteps; j++) {
              await new Promise(r => setTimeout(r, stepDuration / subSteps));
              await sched.checkpoint(taskId, `${checkpointKey}_substep_${j}`, true);
              await this.updateStatus(taskId, {
                progress: {
                  step: `${step} (${j + 1}/${subSteps})`,
                  progress: `${Math.round(((i + (j + 1) / subSteps) / steps.length) * 100)}%`,
                  checkpoints: Object.fromEntries(
                    steps.slice(0, i).map(s => [s, 'done'])
                  ),
                  timestamp: new Date().toISOString()
                }
              });
            }
          } else {
            await new Promise(r => setTimeout(r, stepDuration));
          }

          await sched.checkpoint(taskId, checkpointKey, true);
        }
      }

      // Mark complete
      await this.updateStatus(taskId, {
        status: 'completed',
        completedAt: Date.now(),
        progress: {
          step: 'done',
          progress: '100%',
          result: 'Task finished successfully',
          checkpoints: Object.fromEntries(steps.map(s => [s, 'done'])),
          timestamp: new Date().toISOString()
        }
      });
      await sched.completeTask(taskId);
    });

    // Register simple-task
    this.scheduler.register('simple-task', async (sched, taskId, params) => {
      console.log(`[${taskId}] Running simple task:`, params);
      await this.updateStatus(taskId, { progress: { message: params.message } });
      await new Promise(r => setTimeout(r, 500));
      await sched.completeTask(taskId);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Start a new agent task
    if (url.pathname === '/task/start' && request.method === 'POST') {
      const params = (await request.json()) as any;
      const taskId = `task-${Date.now()}`;

      await this.updateStatus(taskId, {
        status: 'running',
        startedAt: Date.now(),
        complexity: params.complexity || 'demo',
        progress: { step: 'initializing' }
      });

      await this.scheduler.runNow(taskId, params.taskName || 'agent-loop', params);

      return new Response(JSON.stringify({ taskId, status: 'started' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get task status
    if (url.pathname === '/task/status' && request.method === 'GET') {
      const taskId = url.searchParams.get('taskId');
      if (!taskId) {
        return new Response(JSON.stringify({ error: 'Missing taskId' }), { status: 400 });
      }

      const status = this.taskStatuses.get(taskId);
      return new Response(JSON.stringify(status || { error: 'Task not found' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all task statuses
    if (url.pathname === '/tasks' && request.method === 'GET') {
      const tasks = Array.from(this.taskStatuses.values());
      return new Response(JSON.stringify(tasks), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Simulate eviction (restart a task)
    if (url.pathname === '/task/simulate-eviction' && request.method === 'POST') {
      const { taskId } = (await request.json()) as any;
      if (!taskId) {
        return new Response(JSON.stringify({ error: 'Missing taskId' }), { status: 400 });
      }

      const status = this.taskStatuses.get(taskId);
      if (!status) {
        return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404 });
      }

      // Increment eviction counter and reset status to running
      status.evictionCount = (status.evictionCount || 0) + 1;
      status.status = 'running';
      this.taskStatuses.set(taskId, status);

      console.log(`[${taskId}] Simulated eviction #${status.evictionCount}`);

      return new Response(JSON.stringify({ taskId, evictionCount: status.evictionCount }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }

  async alarm() {
    await this.scheduler.alarm();
  }

  private async updateStatus(taskId: string, updates: Partial<TaskStatus>) {
    const current = this.taskStatuses.get(taskId) || {
      taskId,
      taskName: 'unknown',
      status: 'pending',
      progress: {},
      startedAt: Date.now()
    };
    this.taskStatuses.set(taskId, { ...current, ...updates });
  }
}
