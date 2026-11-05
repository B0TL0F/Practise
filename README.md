# Pocket Shop

A small application for practising infrastructure from scratch: **one UI and two backend microservices**. Only application source and tests are supplied. No Dockerfiles, Compose files, pipelines, Terraform, Kubernetes manifests, Helm charts, or cloud resources are provided.

| Component | Default port | Responsibility |
| --- | --- | --- |
| UI | 3000 | Product collection, shopping bag, checkout, recent orders |
| Catalog API | 4001 | Product list and product details |
| Orders API | 4002 | Validates orders, fetches catalog prices, stores orders |

The browser calls both APIs. The orders API also calls the catalog API over HTTP. Prices are calculated by the orders API using catalog data; browser-supplied prices are ignored. All amounts are whole Indian rupees.

## Run locally

Prerequisite: Node.js 22 or newer. There are no third-party dependencies and no install step. From this directory, open **three terminals**:

```powershell
node services/catalog/server.mjs
```

```powershell
node services/orders/server.mjs
```

```powershell
node ui/server.mjs
```

Open **http://localhost:3000**. Add a product, enter a fictional name, place an order, and see it in recent orders. These commands work in Bash too. Stop each process with Ctrl+C.

Run application integration tests:

```powershell
node --test tests/*.test.mjs
```

Tests run the three HTTP servers on automatically assigned ports, use temporary storage, and close the servers afterwards.
If your environment blocks the test runner from starting subprocesses, use `node --test --test-isolation=none tests/*.test.mjs` with Node.js 22.8 or newer.

## Configuration contract

Environment variables are read at process startup. `.env` files are not loaded automatically. Set variables in your shell or your own deployment configuration.

| Variable | Component | Default |
| --- | --- | --- |
| `PORT` | Each process independently | UI `3000`, catalog `4001`, orders `4002` |
| `HOST` | Each process independently | `0.0.0.0` |
| `PUBLIC_CATALOG_URL` | UI | `http://localhost:4001` |
| `PUBLIC_ORDERS_URL` | UI | `http://localhost:4002` |
| `CATALOG_URL` | Orders | `http://localhost:4001` |
| `CORS_ORIGIN` | Each API | `http://localhost:3000` |
| `DATA_DIR` | Orders | `services/orders/data` |

`PUBLIC_*` URLs must be reachable **from the user's browser**. `CATALOG_URL` must be reachable **from the orders process**; container or cluster DNS names can go here. UI configuration is served at `/config.js`, so changing URLs requires a process restart, with no frontend rebuild. Relative public URLs such as `/catalog` and `/orders-api` also work if your reverse proxy strips those prefixes before forwarding. `CORS_ORIGIN` is one exact browser origin, including scheme and port where applicable, with no trailing slash.

Example PowerShell configuration for the orders terminal:

```powershell
$env:PORT = '4002'
$env:CATALOG_URL = 'http://localhost:4001'
$env:DATA_DIR = 'F:/Project_Interview/pocket-shop/local-data'
node services/orders/server.mjs
```

The API services import `lib/http.mjs`. When creating your images, include the service directory **and `lib/`**, preserving their relative paths. The repository root is a suitable image build context. The UI needs only `ui/`.

## API contract

| Method | API | Route | Result |
| --- | --- | --- | --- |
| GET | All three components | `/health` | Process liveness |
| GET | Catalog | `/ready` | Catalog readiness |
| GET | Orders | `/ready` | Catalog connectivity and writable storage directory |
| GET | Catalog | `/products` | Product array |
| GET | Catalog | `/products/field-notebook` | One product, or 404 |
| GET | Orders | `/orders` | All orders, newest first |
| POST | Orders | `/orders` | Creates an order, returns 201 |

POST body (`Content-Type: application/json`):

```json
{
  "customer": "Practice User",
  "items": [{ "productId": "field-notebook", "quantity": 2 }]
}
```

Customer names must have 1–80 trimmed characters. Orders accept 1–20 unique products with integer quantities of 1–99. Invalid input returns 400, invalid media types 415, oversized bodies 413, and catalog outages 503. Catalog requests time out after three seconds. APIs write JSON request logs to stdout and errors to stderr; all processes handle SIGTERM and SIGINT.

## Storage and scope

Catalog data is seeded in source. Orders persist in `DATA_DIR/orders.json` using serialized, atomic file replacement. Restarting with the same data directory retains orders. Removing that file while the service is stopped resets the lab.

Use **one orders process/replica per data directory**. File storage is intentionally simple and is not suitable for shared-volume multi-replica writes. A later application exercise is replacing it with a database before scaling orders horizontally. Catalog and UI are stateless. Data is loaded into memory, so this is a small lab rather than a large order store.

This is a practice store without login, payment, stock reservation, or order idempotency. Everyone can see all orders; use fictional names and keep the lab private. After an ambiguous checkout failure, refresh orders before retrying.

## Build the infrastructure yourself

Choose your own tools and work through these acceptance criteria. No implementation is supplied:

1. Package each component independently and run it as a non-root user.
2. Connect all three locally. Verify browser-to-API routing and orders-to-catalog DNS separately.
3. Persist orders outside the container and prove a restart retains them.
4. Build, test, scan, tag, and push images through your own pipeline and registry.
5. Provision your own compute, network, access controls, and deployment platform.
6. Configure routing, TLS, environment settings, resource limits, and health probes. Use `/health` for liveness and `/ready` for API readiness.
7. Collect logs and metrics using your chosen tooling. The application does not expose a Prometheus metrics endpoint.
8. Stop catalog: new orders should return 503, old orders should still load, and orders liveness should remain healthy while readiness fails.
9. Deploy a new version, practise rollback, then back up and restore the orders data directory with the orders service stopped.

Keep your infrastructure in a directory or repository you create. The app can run without any cloud account.
