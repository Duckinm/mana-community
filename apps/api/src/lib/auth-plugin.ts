import { Elysia } from 'elysia'
import { auth } from '@api/auth'
import { db } from '@api/db'
import { users } from '@mana/db'
import { eq } from 'drizzle-orm'
import { env } from '@api/env'

export const betterAuthPlugin = new Elysia({ name: 'better-auth' })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers })
        if (!session) return status(401)
        return { user: session.user, session: session.session }
      },
    },
    optionalAuth: {
      async resolve({ request: { headers } }) {
        const session = await auth.api.getSession({ headers })
        return { user: session?.user ?? null }
      },
    },
    admin: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers })
        // Local triage convenience (C-296): requires explicit TRIAGE_AUTH_DISABLED=true so a
        // deploy missing NODE_ENV fails closed; never honored when NODE_ENV === 'production'.
        if (env.NODE_ENV !== 'production' && env.TRIAGE_AUTH_DISABLED === 'true') {
          return { user: session?.user ?? null, session: session?.session ?? null }
        }
        if (!session) return status(401)
        const [row] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, session.user.id))
        if (row?.role !== 'admin') return status(403)
        return { user: session.user, session: session.session }
      },
    },
  })
