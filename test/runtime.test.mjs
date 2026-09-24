import test from 'node:test'; import assert from 'node:assert/strict'
test('SDK package exposes component, primitive and runtime APIs', async () => { const sdk = await import('../dist/index.js'); assert.ok(sdk.defineState); assert.ok(sdk.component); assert.equal(sdk.primitive(({label}) => label)({label:'Primitive'}),'Primitive'); assert.ok(sdk.RuntimeProvider); assert.ok(sdk.reactive); assert.ok(sdk.route) })
test('state, action and computed are reactive and serializable', async () => { const {defineState, action, computed} = await import('../dist/index.js'); const state = defineState(1); const double = computed(() => state.get() * 2); let notifications = 0; const unsubscribe = double.subscribe(() => notifications++); action(() => state.set(value => value + 1))(); assert.equal(state.get(), 2); assert.equal(double(), 4); assert.equal(notifications, 1); unsubscribe(); assert.deepEqual(JSON.parse(JSON.stringify({value: state.get()})), {value: 2}) })
test('computed tracks conditional dependencies and suppresses unchanged values', async () => { const {defineState, computed} = await import('../dist/index.js'); const chooseLeft = defineState(true); const left = defineState('left'); const right = defineState('right'); const selected = computed(() => chooseLeft.get() ? left.get() : right.get()); let notifications = 0; selected.subscribe(() => notifications++); left.set('LEFT'); assert.equal(selected.get(), 'LEFT'); assert.equal(notifications, 1); chooseLeft.set(false); assert.equal(selected.get(), 'right'); assert.equal(notifications, 2); left.set('ignored'); assert.equal(notifications, 2); right.set('RIGHT'); assert.equal(selected.get(), 'RIGHT'); assert.equal(notifications, 3) })
test('computed only subscribes to source stores while observed', async () => { const {defineState, computed} = await import('../dist/index.js'); const state = defineState(1); let subscriptions = 0; const subscribe = state.subscribe; state.subscribe = listener => { subscriptions++; const unsubscribe = subscribe(listener); return () => { subscriptions--; unsubscribe() } }; const doubled = computed(() => state.get() * 2); assert.equal(doubled(), 2); assert.equal(subscriptions, 0); const unsubscribe = doubled.subscribe(() => {}); assert.equal(subscriptions, 1); unsubscribe(); assert.equal(subscriptions, 0) })
test('computed refreshes its cached value after a period without subscribers', async () => { const {defineState, computed} = await import('../dist/index.js'); const state = defineState(1); const doubled = computed(() => state.get() * 2); const stop = doubled.subscribe(() => {}); state.set(2); stop(); state.set(3); assert.equal(doubled(), 6); let notifications = 0; const unsubscribe = doubled.subscribe(() => notifications++); state.set(4); assert.equal(doubled(), 8); assert.equal(notifications, 1); unsubscribe() })
test('schema validation rejects missing, wrong and unknown fields and checks asset references', async () => { const {validate, image} = await import('../dist/index.js'); const schema = {id: 'hero', schemaVersion: 1, fields: [{key:'title',type:'text',required:true}, {key:'variant',type:'select',allowedValues:['a']}, {key:'photo',type:'image'}]}; assert.equal(validate(schema, {}).valid, false); assert.equal(validate(schema, {title: 42}).valid, false); assert.equal(validate(schema, {title: 'ok', extra: true}).valid, false); assert.equal(validate(schema, {title: 'ok', variant: 'a', photo: image('hero-image')}).valid, true); assert.equal(validate(schema, {title:'ok',photo:'https://example.test/x.png'}).valid, false) })
test('schema validation applies defaults and nullable rules and checks typed references', async () => {
  const {validate, component, image, reference} = await import('../dist/index.js')
  const schema={id:'card',schemaVersion:1,fields:[
    {key:'title',type:'text',required:true,default:'Untitled'},
    {key:'subtitle',type:'text',nullable:true},
    {key:'photo',type:'image'},
    {key:'target',type:'reference'},
    {key:'mode',type:'select',allowedValues:['small',2,true]},
  ]}
  assert.equal(validate(schema,{subtitle:null,photo:image('hero'),target:reference('page','home'),mode:2}).valid,true)
  assert.equal(validate(schema,{title:null}).valid,false)
  assert.equal(validate(schema,{photo:{kind:'file',id:'hero'}}).errors[0].path,'photo')
  const DefaultCard=component(schema,props=>props.title)
  assert.equal(DefaultCard({}),'Untitled')
})
test('generated runtime is artifact-only and preview sessions are isolated', async () => { const sdk = await import('../dist/index.js'); const first = sdk.defineState({title: 'one'}); const second = sdk.defineState({title: 'two'}); first.set({title: 'draft'}); assert.equal(second.get().title, 'two'); const navigations = []; const runtime = sdk.createRuntime({artifacts: {locale: 'ru-RU', theme: 'dark', routes: {'/': '/home'}}, onNavigate: path => navigations.push(path)}); assert.equal(runtime.route('/'), '/home'); runtime.navigate('/'); assert.deepEqual(navigations, ['/home']); assert.equal(runtime.theme(), 'dark'); assert.equal(runtime.locale(), 'ru-RU'); const source = await import('node:fs/promises'); const bundle = await source.readFile(new URL('../dist/index.js', import.meta.url), 'utf8'); assert.doesNotMatch(bundle, /Constructor API|\/api\/v1|fetch\s*\(/i) })
test('ContentImage renders generated responsive sources with fallback and reference alt', async () => {
  const sdk = await import('../dist/index.js')
  const React = await import('react')
  const {renderToStaticMarkup} = await import('react-dom/server')
  const runtime = sdk.createRuntime({artifacts:{assets:{hero:{
    type:'image',src:'/assets/hero-original.jpg',mimeType:'image/jpeg',width:1280,height:720,
    variants:[
      {src:'/assets/hero-640.webp',mimeType:'image/webp',width:640},
      {src:'/assets/hero-320.webp',mimeType:'image/webp',width:320},
    ],
  }}}})
  const element = React.createElement(sdk.RuntimeProvider,{runtime,children:React.createElement(sdk.ContentImage,{asset:sdk.image('hero','Hero description'),sizes:'100vw',className:'hero-image'})})
  const html = renderToStaticMarkup(element)
  assert.match(html,/<picture>/)
  assert.match(html,/<source[^>]+type="image\/webp"/)
  assert.match(html,/srcSet="\/assets\/hero-320\.webp 320w, \/assets\/hero-640\.webp 640w"/)
  assert.match(html,/src="\/assets\/hero-original\.jpg"/)
  assert.match(html,/alt="Hero description"/)
  assert.match(html,/sizes="100vw"/)
  assert.match(html,/loading="lazy"/)
})
test('ContentImage never issues an empty or Constructor URL for missing generated asset', async () => {
  const sdk = await import('../dist/index.js')
  const React = await import('react')
  const {renderToStaticMarkup} = await import('react-dom/server')
  const runtime = sdk.createRuntime()
  const element = React.createElement(sdk.RuntimeProvider,{runtime,children:React.createElement(sdk.ContentImage,{asset:'missing-image',alt:'Missing image'})})
  const html = renderToStaticMarkup(element)
  assert.match(html,/data-asset-missing="missing-image"/)
  assert.match(html,/aria-label="Missing image"/)
  assert.doesNotMatch(html,/<img|src=/)
})
test('PreviewInstance is a layout-neutral marker for a stable instance ID', async () => {
  const sdk = await import('../dist/index.js')
  const React = await import('react')
  const {renderToStaticMarkup} = await import('react-dom/server')
  const html = renderToStaticMarkup(React.createElement(sdk.PreviewRuntimeProvider, {
    sessionId:'', children:React.createElement(sdk.PreviewInstance,{instanceId:'hero-main',children:React.createElement('section',null,'Hero')})
  }))
  assert.match(html,/data-constructor-instance="hero-main"/)
  assert.match(html,/style="display:contents"/)
  assert.match(html,/<section>Hero<\/section>/)
})
test('preview draft bridge accepts only current-session parent messages from loopback origins', async () => {
  const {createPreviewDraftStore} = await import('../dist/index.js')
  const listeners = new Set()
  const target = {addEventListener: (_type, listener) => listeners.add(listener), removeEventListener: (_type, listener) => listeners.delete(listener)}
  const parent = {}
  const saved = {pages:{home:{instances:{'hero-main':{component:'hero',fields:{title:'saved'}}}}}}
  const store = createPreviewDraftStore('session-a', saved)
  let notifications = 0
  store.subscribe(() => notifications++)
  const disconnect = store.connect(target, parent)
  const deliver = (data, source=parent, origin='http://localhost:5173') => listeners.forEach(listener => listener({data, source, origin}))
  const draft = {pages:{home:{instances:{'hero-main':{component:'hero',fields:{title:'draft'}}}}}}
  const message = (sessionId='session-a', revision=1, content=draft) => ({protocol:1,source:'liapoldus.constructor',type:'content-draft',sessionId,revision,content})
  deliver(message(), {}, 'http://localhost:5173')
  deliver(message(), parent, 'https://attacker.example')
  deliver(message('wrong-session'), parent)
  assert.deepEqual(store.get(), saved)
  deliver(message(), parent, 'null')
  assert.deepEqual(store.get(), saved)
  deliver(message(), parent, 'http://localhost:5173')
  assert.deepEqual(store.get(), draft)
  assert.equal(notifications, 1)
  const loopbackDraft = {pages:{home:{instances:{'hero-main':{component:'hero',fields:{title:'loopback'}}}}}}
  deliver(message('session-a', 2, loopbackDraft), parent, 'http://localhost:5173')
  assert.deepEqual(store.get(), loopbackDraft)
  deliver(message('session-a', 2, {pages:{}}))
  deliver(message('session-a', 3, {pages:{home:{instances:{broken:{component:'hero',fields:null}}}}}))
  deliver({...message('session-a', 3), content: 'not-an-object'})
  assert.deepEqual(store.get(), loopbackDraft)
  disconnect()
  assert.equal(listeners.size, 0)
})
test('preview draft bridge rejects empty session IDs and oversized UTF-8 messages', async () => {
  const {createPreviewDraftStore} = await import('../dist/index.js')
  const listeners = new Set()
  const target = {addEventListener: (_type, listener) => listeners.add(listener), removeEventListener: (_type, listener) => listeners.delete(listener)}
  const parent = {}
  const emptySessionStore = createPreviewDraftStore('')
  const disconnectEmpty = emptySessionStore.connect(target, parent)
  assert.equal(listeners.size, 0)
  disconnectEmpty()

  const saved = {pages:{}}
  const store = createPreviewDraftStore('session-utf8', saved)
  let notifications = 0
  store.subscribe(() => notifications++)
  const disconnect = store.connect(target, parent)
  const oversized = {pages:{home:{instances:{hero:{component:'hero',fields:{title:'😀'.repeat(300_000)}}}}}}
  const message = {protocol:1,source:'liapoldus.constructor',type:'content-draft',sessionId:'session-utf8',revision:1,content:oversized}
  assert.ok(JSON.stringify(message).length < 1_000_000, 'fixture should fit the old character-count limit')
  for (const listener of listeners) listener({data:message,source:parent,origin:'http://127.0.0.1:3000'})
  assert.deepEqual(store.get(), saved)
  assert.equal(notifications, 0)
  disconnect()
})
test('preview selection bridge accepts only current-session parent instance IDs and clears selection', async () => {
  const {createPreviewDraftStore} = await import('../dist/index.js')
  const listeners = new Set()
  const target = {addEventListener: (_type, listener) => listeners.add(listener), removeEventListener: (_type, listener) => listeners.delete(listener)}
  const parent = {}
  const store = createPreviewDraftStore('session-selection')
  let notifications = 0
  store.subscribeSelection(() => notifications++)
  const disconnect = store.connect(target, parent)
  const message = (revision, selectedInstanceId, sessionId='session-selection') => ({
    protocol:1,source:'liapoldus.constructor',type:'content-draft',sessionId,revision,
    content:{pages:{}},selectedInstanceId,
  })
  const deliver = (data, source=parent, origin='http://localhost:5173') => listeners.forEach(listener => listener({data,source,origin}))

  deliver(message(1,'hero-main'),{})
  deliver(message(1,'hero-main', 'wrong-session'))
  deliver(message(1,'x'.repeat(129)))
  assert.equal(store.getSelectedInstanceId(),null)
  assert.equal(notifications,0)

  deliver(message(1,'hero-main'))
  assert.equal(store.getSelectedInstanceId(),'hero-main')
  assert.equal(notifications,1)
  deliver(message(1,'other'))
  assert.equal(store.getSelectedInstanceId(),'hero-main')
  deliver(message(2,null))
  assert.equal(store.getSelectedInstanceId(),null)
  assert.equal(notifications,2)
  disconnect()
  assert.equal(listeners.size,0)
})
