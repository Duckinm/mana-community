import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { listWallets, createWallet, patchWallet, deleteWallet } from '@api/modules/wallets/service'
import { WalletsListResponse, WalletResponse, NotFoundResponse } from '@api/modules/wallets/responses'
import { CreateWalletBody, UpdateWalletBody } from '@api/lib/db-schema'
import { NoContentResponse } from '@api/lib/wire-schema'

export const walletsModule = new Elysia({ name: 'wallets', prefix: '/api/wallets' })
  .use(betterAuthPlugin)

  .get('/', async ({ user }) => {
    return listWallets(user.id)
  }, {
    auth: true,
    response: { 200: WalletsListResponse },
    detail: { tags: ['Wallets'], summary: 'List wallets' },
  })

  .post('/', async ({ body, user, status }) => {
    const row = await createWallet(user.id, body)
    return status(201, row)
  }, {
    auth: true,
    body: CreateWalletBody,
    response: { 201: WalletResponse },
    detail: { tags: ['Wallets'], summary: 'Create a wallet' },
  })

  .patch('/:id', async ({ params, user, body, status }) => {
    const row = await patchWallet(user.id, params.id, body)
    if (!row) return status(404, { message: 'Not found' })
    return row
  }, {
    auth: true,
    params: t.Object({ id: t.String() }),
    body: UpdateWalletBody,
    response: { 200: WalletResponse, 404: NotFoundResponse },
    detail: { tags: ['Wallets'], summary: 'Update a wallet' },
  })

  .delete('/:id', async ({ params, user, status }) => {
    const deleted = await deleteWallet(user.id, params.id)
    if (!deleted) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, {
    auth: true,
    params: t.Object({ id: t.String() }),
    response: { 204: NoContentResponse, 404: NotFoundResponse },
    detail: { tags: ['Wallets'], summary: 'Delete a wallet' },
  })
