// Helper function to call worker
async function callWorker(platform: any, endpoint: string): Promise<Response> {
	const isDev = process.env.NODE_ENV !== 'production';
	if (isDev) {
		return fetch(`http://localhost:1337${endpoint}`);
	}
	return platform!.env!.WORKER.fetch(new Request(`http://worker${endpoint}`));
}

export async function load({ platform, depends }: any) {
	// Depend on tasks data to invalidate cache when needed
	depends('tasks');

	try {
		// Load ALL tasks and apply same filtering as WebSocket to prevent hydration mismatch
		const response = await callWorker(platform, '/tasks');
		const allTasks: any[] = await response.json();
		const tasks = allTasks.filter((t: any) => t.taskId.startsWith("task-"));
		return {
			tasks
		};
	} catch (error) {
		console.error('Failed to load tasks:', error);
		return {
			tasks: []
		};
	}
}