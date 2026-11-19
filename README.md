# LedgerLab Banking Application

A sample banking application with a React dashboard, three Java Spring Boot services, and a PostgreSQL database. It uses synthetic demo data.

## Setup checkpoint

| Area | Status |
|---|---|
| Local lab | The Ubuntu lab was previously set up with Docker, Java 21, Maven, and single-node K3s with Traefik and local-path storage. Recheck cluster readiness from the lab before deploying. |
| Azure bootstrap | Terraform recreated the resource group, Basic ACR `bankingbotlofacr.azurecr.io` with the admin account disabled, Entra app and service principal, GitHub OIDC credential, and registry-scoped `AcrPush` assignment. |
| Pull request CI | The four Docker matrix builds passed. A ruleset on `main` requires PRs and passing validation checks before merging. |
| ACR publishing | The repository variables match the Terraform outputs. The accounts image was verified in the recreated ACR. The [publishing run](https://github.com/B0TL0F/Practise/actions/runs/44390969912) failed during the payments image build. The remaining images still need verification. |
| Terraform | The [bootstrap configuration](infra/bootstrap/main.tf) applied six creations, and a fresh plan showed zero changes. The [bootstrap runbook](infra/bootstrap/README.md) covers fresh setup and adoption. |
| K3s DEV | The namespace, PostgreSQL, app workloads and Services, and Traefik Ingress are defined in `deploy/k3s/dev`. Live deployment and smoke tests are pending. |

## Next steps

1. Complete the publish and verify all four tags under the same full commit SHA in ACR. The payments build hit a Maven Central rate limit while resolving its Spring Boot parent POM.
2. On the K3s lab, apply the DEV namespace and create the `acr-pull` and `postgres-auth` Secrets. Apply the DEV manifests and smoke-test the dashboard and API routes using `ledgerlab.test` as the HTTP host.
3. Add image scanning before publishing, deployment automation and a PROD approval step. Add monitoring after DEV is working.
4. Build the planned Azure networking and private registry access in stages. Confirm the cost and verify a network path for CI and K3s before disabling public ACR access.

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

The frontend calls relative `/api` routes. The planned K3s DEV Ingress will route those requests to the matching backend services and send dashboard requests to Nginx. The Vite development server forwards `/api` to `http://127.0.0.1:8088`. Provide an API gateway at that address or update the proxy for local development.

The payments schema is in `services/payments-service/src/main/resources/schema.sql`.

## Application checks

With Java 21 and Maven installed, run `mvn test` in each service directory. With Node.js and npm installed, run `npm install` and `npm run build` in `web-ui/`.
