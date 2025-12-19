/// <reference types="node" />
import { build } from "esbuild";
import * as fs from "fs";
import * as path from "path";

const dist = "./dist";

// Clean dist
if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true });
}
fs.mkdirSync(dist);

// Build ESM
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.mjs",
  format: "esm",
  target: "esnext",
  bundle: false,
  sourcemap: true,
});

// Build CJS
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  format: "cjs",
  target: "esnext",
  bundle: false,
  sourcemap: true,
});

// Generate TypeScript definitions
const dtsContent = `
// ironalarm: Reliable task scheduling for Cloudflare Durable Objects

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Task {
  taskId: string;
  taskName: string;
  params: any;
  scheduledAt: number;
  status: TaskStatus;
  safetyAlarmAt?: number;
  progress: Record<string, any>;
}

export type TaskHandler = (scheduler: ReliableScheduler, taskId: string, params: any) => Promise<void>;

export class ReliableScheduler {
  constructor(storage: DurableObjectStorage);
  register(taskName: string, handler: TaskHandler): void;
  schedule(at: Date | number, taskId: string, taskName: string, params?: any): Promise<void>;
  runNow(taskId: string, taskName: string, params?: any): Promise<void>;
  checkpoint(taskId: string, key: string, value: any): Promise<void>;
  getCheckpoint(taskId: string, key: string): Promise<any>;
  completeTask(taskId: string): Promise<void>;
  alarm(): Promise<void>;
}
`;

fs.writeFileSync("dist/index.d.ts", dtsContent);

console.log("✓ Build complete: dist/index.mjs, dist/index.js, dist/index.d.ts");
