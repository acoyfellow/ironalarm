import { getTasks } from '$routes/data.remote';

export async function load({ depends }: any) {
	// Depend on tasks data to invalidate cache when needed
	depends('mission-tasks');

	try {
		// Load initial mission tasks and resources
		const tasks = await getTasks('mission4');
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