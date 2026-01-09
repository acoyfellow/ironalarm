import { getTasks } from '$routes/data.remote';

export async function load({ depends }: any) {
	// Depend on tasks data to invalidate cache when needed
	depends('tasks');

	try {
		// Load initial tasks for the homepage demo
		const tasks = await getTasks('task');
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