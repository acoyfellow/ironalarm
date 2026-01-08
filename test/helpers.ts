import { env } from "cloudflare:test";
import { expect } from "vitest";
import type { Task } from "../src/index";

export const getScheduler = () => {
  const id = env.SCHEDULER_DO.idFromName(`test-${Date.now()}-${Math.random()}`);
  return env.SCHEDULER_DO.get(id);
};

export const waitFor = (ms: number) => new Promise(r => setTimeout(r, ms));

export const expectTask = (task: Task | undefined, expected: Partial<Task>) => {
  expect(task).toBeDefined();
  Object.entries(expected).forEach(([key, value]) => {
    expect(task?.[key as keyof Task]).toEqual(value);
  });
};

