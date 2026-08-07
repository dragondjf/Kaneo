import db from "../../database";
import { columnTable, projectTable } from "../../database/schema";

export const DEFAULT_PROJECT_COLUMNS = [
  { name: "To Do", slug: "to-do", position: 0, isFinal: false },
  { name: "In Progress", slug: "in-progress", position: 1, isFinal: false },
  { name: "In Review", slug: "in-review", position: 2, isFinal: false },
  { name: "Done", slug: "done", position: 3, isFinal: true },
] as const;

async function createProject(
  workspaceId: string,
  name: string,
  icon: string,
  slug: string,
) {
  return db.transaction((tx) => {
    const [createdProject] = tx
      .insert(projectTable)
      .values({
        workspaceId,
        name,
        icon,
        slug,
      })
      .returning()
      .all();

    if (createdProject) {
      for (const col of DEFAULT_PROJECT_COLUMNS) {
        tx.insert(columnTable).values({
          projectId: createdProject.id,
          name: col.name,
          slug: col.slug,
          position: col.position,
          isFinal: col.isFinal,
        }).run();
      }
    }

    return createdProject;
  });
}

export default createProject;
