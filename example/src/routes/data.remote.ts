import { query, command, getRequestEvent } from '$app/server';
import { dev } from '$app/environment';

// TODO: Define your data types here
// type MyData = { 
//   message: string; 
//   timestamp: string;
// };

// Helper function to call your Durable Object via the worker
// In development: HTTP calls to localhost:1337
// In production: Service binding (no network latency)
async function callWorker(
  platform: App.Platform | undefined,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  if (dev) {
    // Development: HTTP call to local worker
    return fetch(`http://localhost:1337${endpoint}`, options);
  }

  // Production: Service binding
  return platform!.env!.WORKER.fetch(new Request(`http://worker${endpoint}`, options));
}

async function callWorkerJSON<T>(
  platform: App.Platform | undefined,
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await callWorker(platform, endpoint, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Service error');
      throw new Error(`Service error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Service temporarily unavailable. Please try again.');
    }
    throw error;
  }
}

// Example query function (no auth required)
// TODO: Replace with your actual query functions
export const getHello = query('unchecked', async (): Promise<{ message: string; timestamp: string }> => {
  const platform = getRequestEvent().platform;

  try {
    // Example: Call your Durable Object
    return await callWorkerJSON<{ message: string; timestamp: string }>(platform, '/api/storage/hello');
  } catch (err) {
    console.error('Failed to get hello:', err);
    return {
      message: 'Hello from your remote app!',
      timestamp: new Date().toISOString()
    };
  }
});

// Example command function (requires authentication)
// TODO: Replace with your actual command functions
export const setMessage = command('unchecked', async (message: string): Promise<{ success: boolean; message: string }> => {
  const platform = getRequestEvent().platform;
  const event = getRequestEvent();

  // Check if user is authenticated
  if (!event.locals.session) {
    throw new Error('Please sign in to set messages');
  }

  try {
    // Example: Call your Durable Object with POST
    return await callWorkerJSON<{ success: boolean; message: string }>(
      platform,
      '/api/storage/message',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: message })
      }
    );
  } catch (err) {
    console.error('Failed to set message:', err);
    throw new Error('Unable to set message. Please try again.');
  }
});

// Task operations
export const startTask = command(
  "unchecked",
  async (params: {
    taskName?: string;
    complexity?: string;
    steps?: string[];
    namespace?: string;
    [key: string]: any; // Allow other params like type, mission, etc.
  }): Promise<{ taskId: string; status: string }> => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON<{ taskId: string; status: string }>(
      platform,
      "/task/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      }
    );
  }
);

export const getTaskStatus = query(
  "unchecked",
  async (taskId: string): Promise<any> => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON<any>(
      platform,
      `/task/status?taskId=${encodeURIComponent(taskId)}`
    );
  }
);

export const getTasks = command(
  "unchecked",
  async (namespace?: string): Promise<any[]> => {
    const platform = getRequestEvent().platform;
    const url = namespace ? `/tasks?namespace=${encodeURIComponent(namespace)}` : "/tasks";
    return await callWorkerJSON<any[]>(platform, url);
  }
);

export const pauseTask = command(
  "unchecked",
  async (taskId: string): Promise<{ taskId: string; status: string }> => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON<{ taskId: string; status: string }>(
      platform,
      "/task/pause",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      }
    );
  }
);

export const resumeTask = command(
  "unchecked",
  async (taskId: string): Promise<{ taskId: string; status: string }> => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON<{ taskId: string; status: string }>(
      platform,
      "/task/resume",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      }
    );
  }
);

export const cancelTask = command(
  "unchecked",
  async (taskId: string): Promise<{ taskId: string; status: string }> => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON<{ taskId: string; status: string }>(
      platform,
      "/task/cancel",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      }
    );
  }
);

export const clearCompleted = command(
  "unchecked",
  async (_?: void): Promise<{ count: number; status: string }> => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON<{ count: number; status: string }>(
      platform,
      "/tasks/clear",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );
  }
);

export const resetLevel = command(
  "unchecked",
  async (namespace: string): Promise<{ count: number; status: string }> => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON<{ count: number; status: string }>(
      platform,
      "/tasks/reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namespace }),
      }
    );
  }
);
