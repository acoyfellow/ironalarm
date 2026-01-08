import type { TestSchedulerDO } from "./test-worker";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    SCHEDULER_DO: DurableObjectNamespace<TestSchedulerDO>;
  }
}
