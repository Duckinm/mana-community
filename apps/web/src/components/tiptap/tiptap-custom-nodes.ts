import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageNodeView } from './tiptap-image-node-view'
import { VideoNodeView } from './tiptap-video-node-view'
import { FileNodeView } from './tiptap-file-node-view'

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0]
  },
})

export const Image = Node.create({
  name: 'image',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      fileId: { default: null, rendered: false },
    }
  },
  parseHTML() {
    return [{ tag: 'img[src]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)]
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})

export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      fileId: { default: null, rendered: false },
    }
  },
  parseHTML() {
    return [{ tag: 'video[src]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, { controls: '' })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView)
  },
})

export const FileBlock = Node.create({
  name: 'file',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      name: { default: null },
      fileId: { default: null, rendered: false },
    }
  },
  parseHTML() {
    return [{ tag: 'a[data-file]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-file': '',
        href: HTMLAttributes.src,
        target: '_blank',
        rel: 'noopener noreferrer',
        download: HTMLAttributes.name,
      }),
      HTMLAttributes.name ?? HTMLAttributes.src ?? 'File',
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(FileNodeView)
  },
})
