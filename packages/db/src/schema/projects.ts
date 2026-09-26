import { boolean, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import type { TiptapDoc } from "../lib/rich-text";
import { deletedAt, instant, timestamps } from "./timestamp";
import { users } from "./users";

// Projects table — freelancer's client projects
export const projects = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  client: text("client").notNull().default(""),
  color: text("color").notNull().default("#D4A843"),
  objective: text("objective").default(""),
  icon: text("icon").default(""),
  startDate: text("start_date").default(""),
  dueDate: text("due_date").default(""),
  // Tiptap document; null = empty
  description: jsonb("description").$type<TiptapDoc>(),
  archived: boolean("archived").notNull().default(false),
  // Set when a plan downgrade auto-archived this project; cleared on unarchive
  planArchivedAt: instant("plan_archived_at"),
  // Short uppercase code used as the prefix for task display IDs (e.g. "ACM-12")
  prefix: text("prefix").notNull().default(""),
  // Last task number issued in this project; next task gets taskCounter + 1
  taskCounter: integer("task_counter").notNull().default(0),
  // JSON-serialised string[] of global label ids (see `labels` table)
  labelIds: text("label_ids").default("[]"),
  contactId: text("contact_id"),
  ...timestamps,
  // null = active; set = soft-deleted (purged after 14 days)
  deletedAt,
});
