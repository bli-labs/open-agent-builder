import type { Workflow } from "@/lib/workflow/types";
import type { StorageProvider } from "./types";

// Module-level store (ephemeral, resets on hot reload)
const store = new Map<string, Workflow>();

export const memoryAdapter: StorageProvider = {
  async listWorkflows(userId) {
    const all = Array.from(store.values());
    // userId parameter is available for future filtering if needed
    // Currently returning all workflows as Workflow type doesn't have userId field
    return all;
  },

  async getWorkflow(id) {
    return store.get(id) ?? null;
  },

  async saveWorkflow(workflow, userId) {
    const id = workflow.id ?? `workflow_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const saved: Workflow = {
      ...workflow,
      id,
      updatedAt: new Date().toISOString(),
      createdAt: workflow.createdAt ?? new Date().toISOString(),
    };
    store.set(id, saved);
    return id;
  },

  async deleteWorkflow(id) {
    store.delete(id);
  },
};
