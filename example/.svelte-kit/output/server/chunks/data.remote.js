import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./utils.js";
import { c as command } from "./command.js";
import "@sveltejs/kit";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { q as query } from "./query.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get cancelTask() {
    return cancelTask;
  },
  get clearCompleted() {
    return clearCompleted;
  },
  get getHello() {
    return getHello;
  },
  get getTaskStatus() {
    return getTaskStatus;
  },
  get getTasks() {
    return getTasks;
  },
  get pauseTask() {
    return pauseTask;
  },
  get resetLevel() {
    return resetLevel;
  },
  get resumeTask() {
    return resumeTask;
  },
  get setMessage() {
    return setMessage;
  },
  get startTask() {
    return startTask;
  }
}, Symbol.toStringTag, { value: "Module" }));
async function callWorker(platform, endpoint, options = {}) {
  return platform.env.WORKER.fetch(new Request(`http://worker${endpoint}`, options));
}
async function callWorkerJSON(platform, endpoint, options) {
  try {
    const response = await callWorker(platform, endpoint, options);
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Service error");
      throw new Error(`Service error (${response.status}): ${errorText}`);
    }
    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Service temporarily unavailable. Please try again.");
    }
    throw error;
  }
}
const getHello = query("unchecked", async () => {
  const platform = getRequestEvent().platform;
  try {
    return await callWorkerJSON(platform, "/api/storage/hello");
  } catch (err) {
    console.error("Failed to get hello:", err);
    return {
      message: "Hello from your remote app!",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
});
const setMessage = command("unchecked", async (message) => {
  const platform = getRequestEvent().platform;
  const event = getRequestEvent();
  if (!event.locals.session) {
    throw new Error("Please sign in to set messages");
  }
  try {
    return await callWorkerJSON(
      platform,
      "/api/storage/message",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: message })
      }
    );
  } catch (err) {
    console.error("Failed to set message:", err);
    throw new Error("Unable to set message. Please try again.");
  }
});
const startTask = command(
  "unchecked",
  async (params) => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON(
      platform,
      "/task/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      }
    );
  }
);
const getTaskStatus = query(
  "unchecked",
  async (taskId) => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON(
      platform,
      `/task/status?taskId=${encodeURIComponent(taskId)}`
    );
  }
);
const getTasks = command(
  "unchecked",
  async (namespace) => {
    const platform = getRequestEvent().platform;
    const url = namespace ? `/tasks?namespace=${encodeURIComponent(namespace)}` : "/tasks";
    return await callWorkerJSON(platform, url);
  }
);
const pauseTask = command(
  "unchecked",
  async (taskId) => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON(
      platform,
      "/task/pause",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId })
      }
    );
  }
);
const resumeTask = command(
  "unchecked",
  async (taskId) => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON(
      platform,
      "/task/resume",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId })
      }
    );
  }
);
const cancelTask = command(
  "unchecked",
  async (taskId) => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON(
      platform,
      "/task/cancel",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId })
      }
    );
  }
);
const clearCompleted = command(
  "unchecked",
  async (_) => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON(
      platform,
      "/tasks/clear",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }
    );
  }
);
const resetLevel = command(
  "unchecked",
  async (namespace) => {
    const platform = getRequestEvent().platform;
    return await callWorkerJSON(
      platform,
      "/tasks/reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namespace })
      }
    );
  }
);
init_remote_functions(m, "src/routes/data.remote.ts", "q5s0im");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "q5s0im/" + name;
  fn.__.name = name;
}
export {
  getTasks as g,
  m,
  startTask as s
};
