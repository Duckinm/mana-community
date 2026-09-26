import { describe, expect, it } from 'bun:test'
import {
  isEmptyTiptapDoc,
  isTiptapDoc,
  normalizeTiptapDoc,
  textToTiptapDoc,
  tiptapDocToText,
  type TiptapDoc,
} from './rich-text'

const textDoc = (text: string): TiptapDoc => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

describe('isTiptapDoc', () => {
  it('accepts a doc and rejects everything else', () => {
    expect(isTiptapDoc(textDoc('hi'))).toBe(true)
    expect(isTiptapDoc({ type: 'doc' })).toBe(true)
    expect(isTiptapDoc(null)).toBe(false)
    expect(isTiptapDoc('{"type":"doc"}')).toBe(false)
    expect(isTiptapDoc({ type: 'paragraph' })).toBe(false)
    expect(isTiptapDoc({ type: 'doc', content: 'not-an-array' })).toBe(false)
  })
})

describe('tiptapDocToText', () => {
  it('returns empty string for null', () => {
    expect(tiptapDocToText(null)).toBe('')
  })

  it('joins block nodes with newlines', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Body line' }] },
      ],
    }
    expect(tiptapDocToText(doc)).toBe('Title\nBody line')
  })

  it('extracts text from nested lists', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }],
            },
          ],
        },
      ],
    }
    expect(tiptapDocToText(doc)).toBe('one\ntwo')
  })

  it('recovers text from a migrated pre-Tiptap editor blob', () => {
    const legacy = {
      'block-1': {
        id: 'block-1',
        type: 'HeadingOne',
        value: [{ type: 'heading-one', children: [{ text: "Yo What's up" }] }],
      },
    }
    expect(tiptapDocToText(textDoc(JSON.stringify(legacy)))).toBe("Yo What's up")
  })

  it('leaves ordinary text that starts with a brace alone', () => {
    expect(tiptapDocToText(textDoc('{not json'))).toBe('{not json')
    expect(tiptapDocToText(textDoc('{"a":1}'))).toBe('{"a":1}')
  })
})

describe('textToTiptapDoc', () => {
  it('returns null for blank input', () => {
    expect(textToTiptapDoc('')).toBeNull()
    expect(textToTiptapDoc('   \n  ')).toBeNull()
  })

  it('splits lines into paragraphs and round-trips through tiptapDocToText', () => {
    const doc = textToTiptapDoc('first\nsecond')
    expect(doc?.content).toHaveLength(2)
    expect(tiptapDocToText(doc)).toBe('first\nsecond')
  })
})

describe('isEmptyTiptapDoc / normalizeTiptapDoc', () => {
  it('treats null and paragraph-only docs as empty', () => {
    expect(isEmptyTiptapDoc(null)).toBe(true)
    expect(isEmptyTiptapDoc({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(true)
    expect(normalizeTiptapDoc({ type: 'doc', content: [{ type: 'paragraph' }] })).toBeNull()
  })

  it('treats text content as non-empty', () => {
    expect(isEmptyTiptapDoc(textDoc('hello'))).toBe(false)
    expect(normalizeTiptapDoc(textDoc('hello'))).toEqual(textDoc('hello'))
  })

  it('treats textless media nodes as non-empty', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'https://x/y.png' } }],
    }
    expect(isEmptyTiptapDoc(doc)).toBe(false)
  })
})
