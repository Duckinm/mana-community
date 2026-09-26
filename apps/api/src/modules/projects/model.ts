import { t } from 'elysia'

export {
  CreateProjectBody,
  UpdateProjectBody,
  CreateTaskBody,
  UpdateTaskBody,
  CreateMilestoneBody,
  UpdateMilestoneBody,
} from '@api/lib/db-schema'

export const ReorderColumnsBody = t.Object({
  columns: t.Record(t.String(), t.Array(t.String())),
})
