import type { Workflow } from "@/lib/workflow/types";

export interface StorageProvider {
  /** List all workflows for a user. Pass undefined for anonymous/all workflows. */
  listWorkflows(userId?: string): Promise<Workflow[]>;

  /** Fetch a single workflow by its custom or Convex ID. */
  getWorkflow(id: string): Promise<Workflow | null>;

  /** Save (upsert) a workflow. Returns the saved workflow ID. */
  saveWorkflow(workflow: Workflow, userId?: string): Promise<string>;

  /** Permanently delete a workflow. */
  deleteWorkflow(id: string): Promise<void>;
}
