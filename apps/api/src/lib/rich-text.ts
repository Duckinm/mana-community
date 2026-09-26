import { t } from 'elysia'
import type { TiptapDoc } from '@mana/db/rich-text'

export {
  isEmptyTiptapDoc,
  isTiptapDoc,
  normalizeTiptapDoc,
  textToTiptapDoc,
  tiptapDocToText,
  type TiptapDoc,
  type TiptapMark,
  type TiptapNode,
} from '@mana/db/rich-text'

const tiptapNodeSchema = t.Recursive((Self) =>
  t.Object(
    {
      type: t.Optional(t.String()),
      text: t.Optional(t.String()),
      attrs: t.Optional(t.Record(t.String(), t.Unknown())),
      marks: t.Optional(
        t.Array(
          t.Object(
            { type: t.String(), attrs: t.Optional(t.Record(t.String(), t.Unknown())) },
            { additionalProperties: true },
          ),
        ),
      ),
      content: t.Optional(t.Array(Self)),
    },
    { additionalProperties: true },
  ),
)

const tiptapDocObjectSchema = t.Object(
  {
    type: t.Literal('doc'),
    content: t.Optional(t.Array(tiptapNodeSchema)),
  },
  { additionalProperties: true },
)

/**
 * Boundary validation for rich-text bodies: a Tiptap document (or null).
 * `t.Unsafe` pins the static type to `TiptapDoc` — `t.Recursive`'s inferred
 * static degrades to `never[]` when composed — while Elysia still validates
 * against the full recursive JSON schema at runtime.
 */
export const tiptapDocSchema = t.Unsafe<TiptapDoc>(tiptapDocObjectSchema)

export const nullableTiptapDocSchema = t.Unsafe<TiptapDoc | null>(
  t.Union([tiptapDocObjectSchema, t.Null()]),
)
