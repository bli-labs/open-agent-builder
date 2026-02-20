import type { Workflow } from "@/lib/workflow/types";
import type { StorageProvider } from "./types";

const COLLECTION_NAME = "workflows";

export const firebaseStorageAdapter: StorageProvider = {
  async listWorkflows(userId) {
    const { firestore } = await import("@/lib/firebase/config" as any);
    const { collection, getDocs, query, where } = await import("firebase/firestore" as any);

    const col = collection(firestore, COLLECTION_NAME);
    const q = userId ? query(col, where("userId", "==", userId)) : col;
    const snap = await getDocs(q);

    return snap.docs.map((doc: any) => doc.data() as Workflow);
  },

  async getWorkflow(id) {
    const { firestore } = await import("@/lib/firebase/config" as any);
    const { doc, getDoc } = await import("firebase/firestore" as any);

    const snap = await getDoc(doc(firestore, COLLECTION_NAME, id));
    return snap.exists() ? (snap.data() as Workflow) : null;
  },

  async saveWorkflow(workflow, userId) {
    const { firestore } = await import("@/lib/firebase/config" as any);
    const { doc, setDoc } = await import("firebase/firestore" as any);

    const id = workflow.id ?? `workflow_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const data: Workflow = {
      ...workflow,
      id,
      updatedAt: new Date().toISOString(),
      createdAt: workflow.createdAt ?? new Date().toISOString(),
    };

    await setDoc(doc(firestore, COLLECTION_NAME, id), data);
    return id;
  },

  async deleteWorkflow(id) {
    const { firestore } = await import("@/lib/firebase/config" as any);
    const { doc, deleteDoc } = await import("firebase/firestore" as any);

    await deleteDoc(doc(firestore, COLLECTION_NAME, id));
  },
};
