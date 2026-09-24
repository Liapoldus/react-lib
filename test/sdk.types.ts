import {createElement} from 'react'
import {component, ContentImage, createRuntime, image, PreviewInstance, usePreviewContent, type ComponentSchema} from '../src/index.js'

const schema = {
  id: 'hero',
  schemaVersion: 1,
  fields: [
    {key: 'title', type: 'text', required: true},
    {key: 'variant', type: 'select', allowedValues: ['compact', 'wide']},
  ],
} as const satisfies ComponentSchema

component(schema, props => {
  const title: string = props.title
  const variant: 'compact' | 'wide' | undefined = props.variant
  // @ts-expect-error required schema fields cannot be omitted
  const invalid = component(schema, () => null)({})
  // @ts-expect-error select values are narrowed to the schema enum
  const invalidVariant: 'compact' | 'wide' = 'full-screen'
  return `${title}:${variant}:${invalid}:${invalidVariant}`
})

const defaulted = {
  id: 'defaulted',
  schemaVersion: 1,
  fields: [{key: 'title', type: 'text', required: true, default: 'Untitled'}],
} as const satisfies ComponentSchema
component(defaulted, props => props.title)({})

const nullable = {
  id: 'nullable',
  schemaVersion: 1,
  fields: [{key: 'subtitle', type: 'text', nullable: true}],
} as const satisfies ComponentSchema
component(nullable, props => {
  const value: string | null | undefined = props.subtitle
  return value
})({subtitle: null})

const localizedTitle: string = usePreviewContent<string>('home', 'hero-main', 'title', 'Fallback')
void localizedTitle

const imageView = createElement(ContentImage, {asset: image('hero-image', 'Hero'), sizes: '(max-width: 640px) 100vw, 640px', className: 'hero'})
const imageRuntime = createRuntime({artifacts:{assets:{'hero-image':{type:'image',src:'/assets/hero.jpg',mimeType:'image/jpeg',variants:[{src:'/assets/hero-320.webp',mimeType:'image/webp',width:320}]}}}})
void imageView
void imageRuntime.asset('hero-image')
const previewInstance = createElement(PreviewInstance, {instanceId:'hero-main',children:imageView})
void previewInstance
