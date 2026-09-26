import * as schema from "@mana/db/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@api/env";

// Neon (serverless Postgres) drops idle connections aggressively — a small bounded
// pool avoids piling up dead connections under Fly's single-instance load.
const queryClient = postgres(env.DATABASE_URL, { max: 10, idle_timeout: 20, connect_timeout: 10 });

export const db = drizzle(queryClient, { schema });
