import { and, eq, isNotNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { labelTable } from "../../database/schema";

async function updateLabel(id: string, name: string, color: string) {
  return db.transaction((tx) => {
    const label = tx.query.labelTable.findFirst({
      where: (label, { eq }) => eq(label.id, id),
    }).sync();

    if (!label) {
      throw new HTTPException(404, {
        message: "Label not found",
      });
    }

    const [updatedLabel] = tx
      .update(labelTable)
      .set({ name, color })
      .where(eq(labelTable.id, id))
      .returning()
      .all();

    // If this is a workspace-level label, cascade the changes to all
    // task-level copies so existing label assignments reflect the new color/name
    if (!label.taskId && label.workspaceId) {
      tx
        .update(labelTable)
        .set({ name, color })
        .where(
          and(
            eq(labelTable.workspaceId, label.workspaceId),
            eq(labelTable.name, label.name),
            isNotNull(labelTable.taskId),
          ),
        )
        .run();
    }

    return updatedLabel;
  });
}

export default updateLabel;
