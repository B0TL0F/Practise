# LedgerLab Banking Application

A sample banking application with a React dashboard, three Java Spring Boot services, and a PostgreSQL database. It uses synthetic demo data.

This repository contains application source code, tests, build manifests, and Dockerfiles. CI/CD pipelines, infrastructure provisioning, deployment manifests, and environment setup scripts have been removed. Azure and PC infrastructure will be set up separately using [the master architecture diagram](Banking%20DevOps%20Master%20Architecture%20Diagram.png) as a reference.

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
