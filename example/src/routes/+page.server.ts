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

	// For now, return empty tasks to test if homepage loads
	return {
		tasks: []
	};
}