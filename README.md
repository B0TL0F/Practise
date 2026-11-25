# LedgerLab Banking Application

A sample banking application with a React dashboard, three Java Spring Boot services, and a PostgreSQL database. It uses synthetic demo data. It is also a DevOps practice project: the delivery pipeline, Kubernetes manifests, and cloud setup are built step by step on top of this code.

## Current state

This repository is reset to a starting point: the application code and its Dockerfiles. There is no pipeline, cloud infrastructure, or deployment configuration yet. Nothing is running in Azure.

A finished version of the whole setup is kept as the git tag `reference-complete`. It is for reference only. To browse it:

```sh
git fetch --tags
git checkout reference-complete      # read-only view; return with: git checkout main
```

It contains the Azure setup runbook (`docs/azure-vm-setup.md`), K3s manifests, Argo CD Application, Key Vault wiring, monitoring configuration, and the full CI/CD workflow.

## Branch protection

There is no CI workflow yet, and `main` currently has no ruleset. Once the delivery pipeline exists, add a ruleset in **Settings → Rules → Rulesets** that requires a pull request and the pipeline's checks, and blocks deletions and force pushes.

## Application components

| Path | Purpose | Stack |
|---|---|---|
| `web-ui/` | Banking dashboard | React 19, Vite, Nginx |
| `services/accounts-service/` | Account API | Java 21, Spring Boot |
| `services/payments-service/` | Payment API and database schema | Java 21, Spring Boot, PostgreSQL |
| `services/transactions-service/` | Transaction history and summaries | Java 21, Spring Boot |

Each application includes a `Dockerfile` and `.dockerignore`. The frontend also includes `nginx.conf`, which its Dockerfile requires to serve the built application.

## Build container images

Run from the repository root:

```sh
docker build -t ledgerlab/accounts-service:local services/accounts-service
docker build -t ledgerlab/payments-service:local services/payments-service
docker build -t ledgerlab/transactions-service:local services/transactions-service
docker build -t ledgerlab/web-ui:local web-ui
```

These commands build images only. Database provisioning, container networking, API routing, and deployment are configured separately.

## Application runtime requirements

The Java services listen on port `8080`; the frontend container serves static files on port `80`.

The payments service requires PostgreSQL and uses these environment variables:

| Variable | Purpose | Default |
|---|---|---|
| `DB_URL` | JDBC connection URL | `jdbc:postgresql://postgres:5432/bankinglab` |
| `DB_USER` | Database username | `bankinglab` |
| `DB_PASSWORD` | Database password | Required |
| `ACCOUNTS_URL` | Accounts service URL | `http://accounts-service:8080` |

The transactions service uses `PAYMENTS_URL`, defaulting to `http://payments-service:8080`.

Each Java service reports health at `/actuator/health/readiness`, which is suitable for a Kubernetes readiness probe. The frontend answers `/healthz`.

The frontend calls relative `/api` routes. Route `/api/accounts`, `/api/payments`, and `/api/transactions` to the matching services, and send everything else to the frontend container. The Vite development server forwards `/api` to `http://127.0.0.1:8088`. Provide an API gateway at that address or update the proxy for local development.

The payments schema is in `services/payments-service/src/main/resources/schema.sql`.

## Application checks

With Java 21 and Maven installed, run `mvn test` in each service directory. With Node.js and npm installed, run `npm install` and `npm run build` in `web-ui/`.
