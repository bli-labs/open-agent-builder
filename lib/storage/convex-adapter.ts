import type { Workflow } from "@/lib/workflow/types";
import type { StorageProvider } from "./types";

export const convexAdapter: StorageProvider = {
  async listWorkflows() {
    const res = await fetch("/api/workflows");
    const data = await res.json();
    return data.workflows ?? [];
  },

  async getWorkflow(id) {
    const res = await fetch(`/api/workflows/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.workflow ?? null;
  },

  async saveWorkflow(workflow) {
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
    });
    const data = await res.json();
    return data.workflowId ?? workflow.id ?? `workflow_${Date.now()}`;
  },

  async deleteWorkflow(id) {
    await fetch(`/api/workflows?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
