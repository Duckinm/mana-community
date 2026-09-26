import { t } from 'elysia'

export const IsoInstant = t.String()
export const NullableIsoInstant = t.Union([t.String(), t.Null()])
export const NullableString = t.Union([t.String(), t.Null()])
export const OptionalNullableString = t.Optional(NullableString)

export const NotFoundResponse = t.Object({ message: t.String() })
export const MessageResponse = t.Object({ message: t.String() })
export const SuccessResponse = t.Object({ success: t.Boolean() })
export const ErrorResponse = t.Object({ error: t.String() })
export const NoContentResponse = t.Void()

export const TimestampsWire = t.Object({
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
})
