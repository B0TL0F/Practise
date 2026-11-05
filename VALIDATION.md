# Verification

Verified locally on Windows with Node.js 24.13.0:

```powershell
node --test --test-isolation=none tests/*.test.mjs
```

All seven reported tests passed (one parent test and six integration subtests):

- UI assets and runtime API configuration are served.
- Catalog discovery, CORS headers, and readiness work.
- Invalid JSON, unsupported content types, oversized bodies, invalid products, duplicate items, and invalid quantities are rejected.
- Five simultaneous orders persist, and catalog prices override client-provided amounts.
- Orders survive an orders-server restart using the same data directory.
- Catalog failure returns 503 for checkout and readiness while saved orders and liveness stay available.

The default test runner subprocess launch was blocked by this workspace's process restrictions; the command above ran the HTTP integration checks in one process. Browser rendering and interaction were not verified. Infrastructure deployment is intentionally left for you.
