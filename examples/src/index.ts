import { Hono } from 'hono';
import { AgentDO } from './agent';
import { getHTML } from './html';

export { AgentDO };

type Env = {
  AGENT: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
  return c.html(getHTML());
});

app.get('/index.html', (c) => {
  return c.html(getHTML());
});

app.all('/task/*', async (c) => {
  const id = c.env.AGENT.idFromName('agent-1');
  const stub = c.env.AGENT.get(id);
  return stub.fetch(c.req.raw);
});

app.all('/tasks', async (c) => {
  const id = c.env.AGENT.idFromName('agent-1');
  const stub = c.env.AGENT.get(id);
  return stub.fetch(c.req.raw);
});

export default {
  fetch: app.fetch,
  async alarm(controller: any, env: Env): Promise<void> {
    const id = env.AGENT.idFromName('agent-1');
    const stub = env.AGENT.get(id);
    await (stub as any).alarm();
  },
};
