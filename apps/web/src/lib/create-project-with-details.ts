import type { ApiProjectCreateBody } from '@/lib/api-types'
import { NEW_PROJECT_DEFAULTS } from '@/components/projects/constants'
import type { NewProjectInput } from '@/components/projects/new-project-types'
import type { Project } from '@/components/projects/types'
import { client, expectEden } from '@/lib/eden'

export async function createProjectWithDetails(
  addProject: (project: ApiProjectCreateBody) => Promise<Project>,
  input: NewProjectInput,
): Promise<Project> {
  const created = await addProject({
    name: input.name,
    client: input.client,
    contactId: input.contactId,
    color: input.color,
    icon: input.icon,
    objective: input.objective,
    description: input.description,
    startDate: NEW_PROJECT_DEFAULTS.startDate,
    dueDate: NEW_PROJECT_DEFAULTS.dueDate,
  })

  if (input.milestones.length > 0) {
    await Promise.all(
      input.milestones.map(async (milestone) =>
        expectEden(
          await client.api.projects({ id: created.id }).milestones.post({
            name: milestone.name,
            dueDate: milestone.dueDate,
          }),
        ),
      ),
    )
  }

  return created
}
