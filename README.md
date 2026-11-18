# LedgerLab Banking Application

A sample banking application with a React dashboard, three Java Spring Boot services, and a PostgreSQL database. It uses synthetic demo data.

## Setup checkpoint

| Area | Status |
|---|---|
| Local lab | Ubuntu, Docker, Java 21 and Maven are set up. The single-node K3s cluster is Ready with Traefik and default local-path storage. |
| Azure bootstrap | Basic ACR `bankingbotlofacr.azurecr.io` was created manually with the admin account disabled. The GitHub OIDC credential, registry publishing permission and GitHub Actions variables were configured. |
| Pull request CI | The four Docker matrix builds passed. A ruleset on `main` requires PRs and passing validation checks before merging. |
| ACR publishing | [GitHub Actions workflow](.github/workflows/ci.yaml) adds a publishing job for pushes to `main`. It uses OIDC and tags images with the full commit SHA. The first publish run still needs verification. |
| Terraform | [Azure bootstrap configuration](infra/bootstrap/main.tf) and [import steps](infra/bootstrap/README.md) are ready to review. Formatting passed. Provider validation, imports and a live plan are pending. |

## Next steps

1. Merge the publishing workflow through a PR. Verify that PRs run the validation builds and that the subsequent run on `main` publishes all four images to ACR under the merge commit SHA.
2. Configure pull-only registry access for K3s. Deploy PostgreSQL, the three APIs and the web UI to DEV, configure Traefik routes and run a smoke test.
3. Add image scanning before publishing, deployment automation and a PROD approval step. Add monitoring after DEV is working.
4. Build the planned Azure networking and private registry access in stages. Confirm the cost and verify a network path for CI and K3s before disabling public ACR access.
5. Import the existing Azure bootstrap resources into Terraform and reconcile the plan until it proposes zero changes. Document and adopt later Azure resources once their manual setup has been verified.

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

The frontend calls relative `/api` routes. Its Nginx configuration serves static assets only, so the future environment must route API requests to the matching backend services. The Vite development server currently forwards `/api` to `http://127.0.0.1:8088`; provide an API gateway at that address or update the proxy for your local environment.

The payments schema is in `services/payments-service/src/main/resources/schema.sql`.

## Application checks

With Java 21 and Maven installed, run `mvn test` in each service directory. With Node.js and npm installed, run `npm install` and `npm run build` in `web-ui/`.
