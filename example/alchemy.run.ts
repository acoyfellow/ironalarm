import alchemy from "alchemy";

import {
  SvelteKit,
  Worker,
  DurableObjectNamespace,
  D1Database
} from "alchemy/cloudflare";

import type { TaskSchedulerDO } from "./worker/index.ts";

const projectName = "ironalarm";

const project = await alchemy(projectName, {
  password: process.env.ALCHEMY_PASSWORD || "default-password"
});

// Create Durable Object namespace for TaskSchedulerDO
const TASK_SCHEDULER_DO = DurableObjectNamespace(`${projectName}-scheduler-do`, {
  className: "TaskSchedulerDO",
  scriptName: `${projectName}-worker`,
  sqlite: true
});

// Create D1 database for auth (required for Better Auth)
const DB = await D1Database(`${projectName}-db`, {
  name: `${projectName}-db`,
  migrationsDir: "migrations",
  adopt: true,
});

// Create the worker that hosts your Durable Objects
export const WORKER = await Worker(`${projectName}-worker`, {
  name: `${projectName}-worker`,
  entrypoint: "./worker/index.ts",
  adopt: true,
  bindings: {
    TASK_SCHEDULER_DO,
  },
  url: false
});

// Create the SvelteKit app
export const APP = await SvelteKit(`${projectName}-app`, {
  name: `${projectName}-app`,
  bindings: {
    TASK_SCHEDULER_DO, // Make your DO available to SvelteKit
    WORKER,            // Make worker available for service bindings
    DB,                // Database for Better Auth
  },
  url: true,
  adopt: true,
  env: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "85000968f86b5d30510b5b73186b914c430f8e1573614a6d75ed4cc53383517a",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:5173",
  }
});

await project.finalize();
