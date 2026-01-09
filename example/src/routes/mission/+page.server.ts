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
	depends('mission-tasks');

	try {
		// Load ALL tasks and apply same filtering as WebSocket to prevent hydration mismatch
		const response = await callWorker(platform, '/tasks');
		const allTasks: any[] = await response.json();
		const tasks = allTasks.filter(
			(t: any) =>
				t.taskId.startsWith("mission4-") ||
				t.taskId === "mission4-global-state" ||
				(t.taskId === "global-state" && t.params?.namespace === "mission4")
		);
		return {
			tasks
		};
	} catch (error) {
		console.error('Failed to load mission tasks:', error);
		return {
			tasks: []
		};
	}
}