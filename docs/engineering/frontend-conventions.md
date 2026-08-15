---
title: Frontend Conventions
sidebar_position: 4
description: React Router v7 SSR, API clients, forms, surfaces.
---

## TL;DR

- React Router v7 SSR (JavaScript): `app/routes/`, `app/api/`, `app/domains/`, ky + zod + RHF.
- Role-confined surfaces (Tourist, Corporate, Provider, Admin); no client-side price computation.

## About this document

Frontend implementation conventions for `red-cab-web`.

| Topic | Document |
| --- | --- |
| Code mapping | [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) |
| Engineering overview | [Engineering](/docs/engineering) |
| API contracts | [API Design](/docs/architecture/api-design) |
| Functional behavior | [Functional Requirements](/docs/requirements/functional-requirements) |

---

## Stack (locked for implementation)

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | React 19 + React Router v7 (framework mode, SSR) | Not a client-only SPA |
| Language | **JavaScript** (`.js`, `.jsx`) — **no TypeScript** | Locked |
| Bundler | Vite | HMR in dev, SSR production build |
| UI | react-bootstrap v2 + Bootstrap 5 SCSS | Bootstrap-first; custom CSS only when needed |
| Icons | lucide-react | |
| Forms | react-hook-form + zod + @hookform/resolvers | Schemas in `*-schema.js` |
| HTTP | ky | Configured in `app/api/ky-client.js` |
| Lint / format | ESLint v9 + Prettier | 2-space, no semicolons, single quotes |
| i18n | EN/JA | Cross-cutting (`OPR-9`); surface defaults per role |

---

## Directory structure

```
app/
  api/                         # ky-based API modules
    ky-client.js
    marketplace-catalog-listings-api.js
    tourists-bookings-booking-api.js
    ...
  components/                  # Shared UI (forms, HOCs, breadcrumbs)
    forms/
    hocs/                      # with-tourist-auth, with-provider-auth, etc.
    navigation/
      team-page-shell.jsx
    error-display/
  domains/                     # Business views, forms, schemas
    catalog-listing/
      catalog-listing-constant.js
      catalog-listing-schema.js
      catalog-listing-form.jsx
      catalog-listing-form-fields.jsx   # large forms only
      catalog-listing-detail-view.jsx
      catalog-listing-list-view.jsx
      catalog-listing-filter-form.jsx
  errors/
    api-error.js
  hooks/
    use-auth.jsx
    use-toast.jsx
  layouts/
    tourist/
    corporate/
    provider/
    team/
  routes/                      # Page modules (*-page.jsx)
  utils/
    search-param-utils.js
    error-utils.js
    loader-utils.js
    date-time-utils.js
  routes.js                    # Master registry
  marketplace.routes.js
  tourist.routes.js
  corporate.routes.js
  provider.routes.js
  team.routes.js
```

Path alias: `@` → `app/`

See [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) for surface → route group mapping.

---

## Routing conventions

### Route registry

Split route groups per surface, imported into `app/routes.js`:

```js
import { marketplaceRoutes } from './marketplace.routes.js'
import { teamRoutes } from './team.routes.js'

const routes = [
  layout('layouts/tourist/tourist-public-layout.jsx', [ ...marketplaceRoutes ]),
  layout('layouts/team/team-layout.jsx', teamRoutes),
  route('*', './routes/catch-all-routes.jsx')
]
```

Use explicit `route()`, `layout()`, `prefix()`, `index()` — **never** Rails-style `resources`.

### Page module exports

Every route page exports:

```jsx
export const meta = () => ([
  { title: 'Listings | Red Cab' },
  { name: 'robots', content: 'index, follow' }  // or noindex for private
])

export const handle = {
  breadcrumb: 'Listings',
  pageShell: { guidanceText: '...' }  // team pages only
}

export default withTouristAuth(BookingsListPage)
```

### Route page naming

- Files: `team-bookings-list-page.jsx` under `app/routes/**`
- Components: PascalCase with segment context — `TeamBookingsListPage`
- Resource folders: flat, full domain-model names (not nested)

### Breadcrumbs

Driven by `handle.breadcrumb` on route modules. `Breadcrumbs` reads them via `useMatches()`.

Supported formats: string, `{ label, isClickable }`, or function `({ params }) => ...`.

### Robots

- Public discovery: `index, follow`
- Authenticated tourist / corporate / provider / admin: `noindex, nofollow`

---

## Auth HOCs

| HOC | Surface | Guard |
| --- | --- | --- |
| `withNoAuth` | Login/signup pages | Redirect if already logged in |
| `withTouristAuth` | Tourist account pages | Logged-in tourist |
| `withCorporateAuth` | Client Portal | Logged-in corporate client |
| `withProviderAuth` | Provider Portal | Logged-in approved provider |
| Team admin auth | Admin Panel (`/team`) | Independent admin identity — **not** coupled to tourist/user auth |

Wrap at default export: `export default withProviderAuth(ProviderListingsPage)`

---

## API layer

### API client pattern

```js
const RESOURCE_PATH = 'marketplace/catalog/listings'

export const marketplaceCatalogListingsApi = {
  index  : (params) => apiClient.get(RESOURCE_PATH, {
    searchParams: removeObjectEmptyAttributes(params)
  }).json(),
  show   : (id)    => apiClient.get(`${RESOURCE_PATH}/${id}`).json(),
}
```

### Rules

- API calls **only** in: route loaders (`loader`/`clientLoader`), submit handlers, select-search fields
- **Never** in passive view components
- Uppercase `*_PATH` constants
- Whitelist payload/query fields explicitly
- Pass SSR cookie headers in loaders when user-scoped
- `credentials: 'include'` for JWT cookies

### ky-client features

- CSRF token injection
- 401 → JWT refresh
- HTTP errors → `ApiError` class
- `getApiErrorToastConfig` + `setApiErrorsToFormFields` in submit handlers

### Error handling

| Utility | Purpose |
| --- | --- |
| `getApiErrorToastConfig(error)` | Toast config for API errors |
| `setApiErrorsToFormFields(error, setError)` | Map 422 field errors to RHF |
| `handleLoaderError(error, fallback)` | Standard loader error handler |

Loader pattern:

```jsx
export async function clientLoader({ request }) {
  try {
    const url    = new URL(request.url)
    const params = Object.fromEntries(url.searchParams)
    const data   = await touristsBookingsBookingApi.index(params)
    return { bookings: data.bookings, meta: data.meta }
  } catch (error) {
    return handleLoaderError(error, { bookings: [], meta: { last: 1 } })
  }
}
```

Submit pattern:

```jsx
const handleSubmit = async (values) => {
  try {
    await touristsBookingsBookingApi.create(values)
    showToast({ message: 'Booking created', type: 'success' })
    navigate('/account/bookings')
  } catch (error) {
    showToast(getApiErrorToastConfig(error))
    setApiErrorsToFormFields(error, setError)
  }
}
```

---

## Domain components

### Naming

Folders: flat, hyphenated — `catalog-listing/`, `bookings-booking/`, `corporate-quotation/`

| File | Purpose |
| --- | --- |
| `{model}-constant.js` | Enums, label maps |
| `{model}-schema.js` | Zod schema |
| `{model}-form.jsx` | RHF + FormProvider |
| `{model}-list-view.jsx` | List item display |
| `{model}-detail-view.jsx` | Detail display |
| `{model}-filter-form.jsx` | URL-driven filters |

### View rules

- Passive — no API calls, no side effects
- Props named after model: `catalogListing`, `bookingsBooking`
- Bootstrap components before custom CSS
- List views wrapper-agnostic (parent owns `ListGroup.Item`)

### Embedded relationships in detail views

When a detail serializer includes an embedded `has_one` (e.g. `provider_profile` inside a listing), render as a distinct section within the same card — not flat inlined fields:

- Parent attributes first in `<ListGroup variant="flush">`
- Embedded section below with subdued header (`bg-secondary-subtle`) and its own attribute rows
- Use `Card` + branded header when the embedded model is the primary context

---

## Forms

```jsx
const methods = useForm({
  resolver      : zodResolver(catalogListingSchema),
  defaultValues : defaultValues
})

return (
  <FormProvider { ...methods }>
    <form onSubmit={ methods.handleSubmit(onSubmit) }>
      ...
    </form>
  </FormProvider>
)
```

- Schemas in `app/domains/{model}/{model}-schema.js`
- Reusable fields from `app/components/forms/`
- Cross-field rules in zod `refine` / `superRefine`
- Keep fields inline in the form file by default; split `*-form-fields.jsx` only for large multi-card forms

### Date and time

- `DateField` holds naive wall-clock values; RHF carries them untouched
- Convert in exactly one place — the submit handler — via `DateTimeUtils.toApiString(value, { timezone })`
- Edit forms: `DateTimeUtils.toFormValue(apiValue, { timezone })`
- Use platform **Service Timezone** (JST, `OPR-11`) for slot windows and cancellation cutoffs. Geography centroids are for map display and near-me only — not per-Area timezones.
- See [Backend Conventions — Date / time / timezone](/docs/engineering/backend-conventions#date--time--timezone-handling) for instant vs civil date rules

### Geography and maps (Phase 1)

- Render District/Area **pins** from API `latitude`/`longitude` — no client-side boundary loading.
- Near-me: request browser geolocation; pass coordinates to near-me Areas API; do not compute haversine in the client for authoritative ranking.
- Geography labels: render `name_en` or `name_ja` per language preference; disambiguate homonymous Areas with parent District in UI.
- See [Geography](/docs/architecture/geography).

---

## State management

No Redux/Zustand. Use:

| Mechanism | Purpose |
| --- | --- |
| `AuthContext` | Auth state |
| `useSearchParams` | List filters, sort, page (URL is source of truth) |
| React Router loaders | Server data |
| `useState` | Local UI state |

Reset `page` to `1` when filters change.

Use `prepareSearchParams` / `serializeUrlParams` from `app/utils/search-param-utils.js`. Pagination reads `meta.page`, `meta.last`, `meta.count` from API responses.

---

## Red Cab–specific frontend rules

1. **Never compute price on the client.** Display `price_breakdown` from `calculate_quote` API response only. No `listing.base_price * passengers` in JSX or utils.
2. **Never mutate API response objects.** Pass-through data from serializers.
3. **Checkout shows server-confirmed breakdown.** Submit booking with slot/listing/passenger selections; amounts come back from API.
4. **Role-confined surfaces.** Tourist pages don't import provider auth HOCs. One segment per page.
5. **EN/JA rendering.** Use stored language preference; geography labels use `name_en` / `name_ja` / `name_kana` from API; disambiguate homonymous Areas with parent District.
6. **corporate documents.** PDF download links from API; no client-side PDF generation.
7. **Stripe Elements (if used).** Payment UI embeds Stripe client SDK; charge amount still originates from server snapshot, not client input.

---

## Code style

- 2-space indent, no semicolons, single quotes, no trailing commas
- Colon-aligned object keys
- Arrow function parens always: `(x) => x`
- Verbose iteration names: `slots.map((slot) => ...)` not `(s) => ...`
- JSX: plain text in `{ 'quotes' }`, one prop per line when >1 prop
- Curly braces on their own line for multi-branch ternaries
- Import order: builtin → external → `@/` internal → parent → sibling
- Route files: `team-bookings-list-page.jsx` → `TeamBookingsListPage`
- Constants: SCREAMING_SNAKE_CASE (`TEAM_BOOKINGS_PAGE_METADATA`)
- Booleans: `is` prefix (`isLoading`, `isApproved`)

### Styling

- Bootstrap utilities and components first; custom SCSS only when insufficient
- Brand overrides in `app/styles/_variables.scss`
- Component-specific styles adjacent to the component or in `_components.scss`

---

## Admin Panel layout

Admin pages use three-level layout nesting:

```
TeamLayout (sidebar + main)
  → Domain layout (breadcrumb-only Outlet, e.g. bookings-layout.jsx)
    → Page layout (wraps TeamPageShell, reads handle.pageShell)
      → Page (content only — never import TeamPageShell directly)
```

### Page layout pattern

Each resource group has a page layout that:

1. Imports `TeamPageShell` and shared `*-navigation.js` constants
2. Uses `useMatches()` to read `handle.pageShell` overrides from the child route
3. Merges overrides and renders `<Outlet />` as children

### Per-page overrides via `handle.pageShell`

| Key | Purpose |
| --- | --- |
| `guidanceText` | Info callout below header |
| `title` | Override shell title |
| `description` | Override shell description |
| `transformResourceActions` | Transform tab actions (e.g. change `end` prop) |

### Navigation constants

Each resource group exports metadata and tab actions from `*-navigation.js`:

```js
export const TEAM_BOOKINGS_PAGE_METADATA = {
  contextLabel : 'Bookings',
  title        : 'Bookings',
  description  : 'View and manage all platform bookings.'
}

export const TEAM_BOOKINGS_RESOURCE_ACTIONS = [
  { label: 'List', to: '/team/bookings', icon: 'list', end: true }
]
```

Resource action shape: `{ label, to, icon, end, disabled?, badge? }` — icons: `'list' | 'plus' | 'check-circle'`.

---

## Environment visibility

Use `VITE_APP_ENV` + `isVisibleIn(['development', 'qa'])` to gate unreleased routes — **fail closed** so unknown env values hide the feature.

`VITE_APP_ENV` is baked at **build time** via `import.meta.env` — never `process.env.VITE_*`.

```js
// app/config/app-env.js
export const APP_ENV     = import.meta.env.VITE_APP_ENV
export const isVisibleIn = (allowedEnvs) => allowedEnvs.includes(APP_ENV)
```

Gate in two places:

1. **Route registry** — omit the route in production so it is not bundled
2. **Navigation links** — hide links to unreachable pages

Env hiding is **not** API security — backend must enforce authorization independently.

---

## Anti-patterns (never)

1. API calls from passive view components
2. TypeScript (`.ts`/`.tsx`)
3. Price arithmetic on the client
4. Domain forms in `app/components/`
5. Domain views in `app/routes/`
6. `process.env.VITE_*` (use `import.meta.env`)
7. Mixing auth HOCs across role surfaces
8. Custom CSS when Bootstrap utilities suffice
9. Skipping `meta` export on route pages
10. Importing `TeamPageShell` directly in page components
11. Mutating backend response objects
12. Layout components with visual chrome in `app/routes/` (use `app/layouts/`)
13. Gating unreleased features with `=== 'production'` (fails open — use allow-list via `isVisibleIn`)
14. Hardcoded timezones or inline date formatting outside `DateTimeUtils`

---

## AI tooling (at scaffold time)

When `red-cab-web` is created, set up the standard layout:

- `.ai/instructions.md` — derived from this document and [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping)
- Skills: `creating-route-pages`, `creating-api-clients`, `creating-domain-forms`, `creating-domain-views`, `team-domain-page`
- `.cursor/rules/00-repo-core.mdc`, `10-routes-api-forms.mdc`, etc.

---

## Related documents

- [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping)
- [Backend Conventions](/docs/engineering/backend-conventions)
- [../architecture/api-design.md](/docs/architecture/api-design)

