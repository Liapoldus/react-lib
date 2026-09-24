# @liapoldus/react

Constructor SDK for ordinary React applications. It adds schema metadata,
serializable state and generated-runtime helpers without replacing React.

```ts
const title = defineState('Главная')
const schema = { id: 'hero', schemaVersion: 1, fields: [{ key: 'title', type: 'text', required: true }] } as const
const Hero = component(schema, ({title}) => <h1>{title}</h1>)
```

The production runtime is artifact-only: it does not call the Constructor API.

Use `createRuntime({artifacts})` in generated production entrypoints. Wrap a
project entry in `PreviewRuntimeProvider` to receive Constructor's isolated
draft channel, then read schema content with `usePreviewContent`:

```tsx
<PreviewRuntimeProvider initialContent={generatedContent}>
  <App />
</PreviewRuntimeProvider>

function HeroTitle() {
  const title = usePreviewContent<string>('home', 'hero-main', 'title', 'Untitled')
  return <h1>{title}</h1>
}
```

Preview messages are scoped to a random session ID, monotonic revision, parent
window and loopback origin. The provider stores drafts in memory only. Inspector
drafts are not shared with production or another preview session.

Wrap a rendered content instance in `PreviewInstance` with its stable instance
ID. The Constructor selection message then draws a layout-neutral outline around
that instance; outside an active preview it renders as an ordinary
`display: contents` wrapper and adds no Constructor API dependency.

`computed(() => state.get() + 1)` returns a callable derived value with
`get()`/`subscribe()` methods. State reads are tracked dynamically, including
conditional dependencies; use `reactive(computedValue)` inside a React
component to subscribe. Component props are inferred from the schema field
array, required keys stay required, and select values are narrowed to their
declared `allowedValues`.

Field validation applies schema defaults when a value is omitted, rejects
explicit `null` unless `nullable: true`, and validates typed asset/entity
references rather than accepting arbitrary objects.

`ContentImage` resolves a typed asset reference through the generated runtime
asset map and renders a responsive `<picture>` when WebP/width variants exist,
with the original asset as the `<img>` fallback. It accepts ordinary image
attributes such as `sizes`, uses reference/explicit alt text, and renders an
accessible missing-asset marker instead of an empty or invalid image URL. The
Constructor-side variant producer and processing policy are still roadmap work;
without generated variants, the original image is used directly.
