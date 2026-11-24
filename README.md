# LedgerLab Banking Application

A sample banking application with a React dashboard, three Java Spring Boot services, and a PostgreSQL database. It uses synthetic demo data. It is also a DevOps practice project: images are built by GitHub Actions, stored in Azure Container Registry, and run on a single-node K3s cluster on an Azure Ubuntu VM. Argo CD keeps the cluster in sync with this repository, and Azure Key Vault holds the secrets.

## Checkpoint (2026-11-24)

**The code and configuration are complete and were verified end to end. The Azure resources were deleted to save cost and must be recreated.** Follow [docs/azure-vm-setup.md](docs/azure-vm-setup.md) to rebuild from this checkpoint on any machine.

| Area | State at the checkpoint |
|---|---|
| Application | Four images build and pass pull request validation. |
| CI/CD workflow | `.github/workflows/ci.yaml` validates on pull requests, publishes SHA-tagged images to ACR from `main` (OIDC login, no stored Azure password), and then opens a tag-bump pull request. It can also be run by hand from `main` (**Actions → Build → Run workflow**). `publish` skips itself while the `ACR_NAME` variable is unset. |
| K3s DEV manifests | `deploy/k3s/dev` deployed and healthy: all pods ran and `/` plus the three `/api/*` routes returned HTTP 200. |
| Secrets | `deploy/k3s/dev/secretstore.yaml` and `externalsecrets.yaml` create `postgres-auth` and `acr-pull` from Azure Key Vault through the External Secrets Operator and the VM's managed identity. No secret values are in git. |
| GitOps | `deploy/argocd/ledgerlab-dev.yaml` is an Argo CD Application with automated sync, prune, and self-heal. A full release was proven: merge, publish, bot pull request, merge, Argo CD rollout. |
| Monitoring | **Written but never installed.** `deploy/monitoring` holds Helm values and Key Vault wiring for `kube-prometheus-stack` (pinned `93.9.0`). Install it next. |
| Azure | **Deleted.** Nothing is running or billing. Names to reuse are listed below. |
| GitHub | The five Azure repository variables and the `DEPLOY_PR_TOKEN` secret were removed. The old personal access token should be revoked in GitHub settings. |
| Key Vault | `kv-ledgerlab-shubham` is **soft-deleted with purge protection** until about 2027-02-22. **Recover it, do not create it.** Its secrets come back, but replace the ACR login. |
| Terraform | `infra/bootstrap` is the earlier Terraform approach and is **not used** by the current manual setup. |

## How it fits together

```
 push / PR ─▶ GitHub Actions ──(OIDC)──▶ Azure Container Registry (images tagged with commit SHA)
                  │ after publish
                  ▼
        pull request "Deploy <sha> to DEV"  (edits image tags in deploy/k3s/dev)
                  │ you review and merge
                  ▼
   Argo CD (inside K3s) polls this repo ──▶ rolls out the new images to namespace ledgerlab-dev

   Azure Key Vault ──(VM managed identity)──▶ External Secrets Operator ──▶ Kubernetes Secrets
   Traefik Ingress (host ledgerlab.test) ──▶ web-ui and the three APIs ──▶ PostgreSQL
```

Argo CD pulls from git, so nothing needs inbound access to the VM. Argo CD, Grafana and Prometheus stay private and are reached through an SSH tunnel and `kubectl port-forward`.

## Release flow

1. Open a pull request. The `validate` job builds all four images.
2. Merge to `main`. The `publish` job pushes `accounts-service`, `payments-service`, `transactions-service`, and `web-ui` to ACR, tagged with the full commit SHA.
3. The `update-manifests` job opens a pull request that points the four Deployments at that SHA. It uses the `DEPLOY_PR_TOKEN` secret so the required checks run.
4. Merge that pull request. Argo CD applies it.
5. Changes under `deploy/`, `docs/`, or `*.md` do not trigger another publish, so the bump cannot loop.

**Rollback:** revert the "Deploy ..." pull request in GitHub. Do not use `kubectl rollout undo`, because Argo CD self-heal reverts it. Old image tags must stay in ACR for this to work.

**Today there is no automatic rollback.** A version that never becomes Ready keeps the old pods serving, but nothing reverts or alerts. Automatic rollback needs monitoring plus Argo Rollouts.

## Rebuild from this checkpoint

Full commands are in [docs/azure-vm-setup.md](docs/azure-vm-setup.md). The order is:

1. Resource group `rg-banking` and registry `bankingshubham01`.
2. Entra app `github-banking-ci` with a GitHub OIDC credential and the `AcrPush` role. Set the five GitHub variables, then run **Build** from `main`.
3. Recover Key Vault `kv-ledgerlab-shubham`. Create the pull-only app `sp-banking-acr-pull` (`AcrPull`) and store its login in the vault.
4. VM `vm-ledgerlab` with a managed identity that has `Key Vault Secrets User`, and a firewall limited to your own IP.
5. On the VM: K3s, Helm, External Secrets Operator, Argo CD.
6. Point `deploy/k3s/dev` at the image tag that was just published, merge, and apply the Argo CD Application.
7. Create the `DEPLOY_PR_TOKEN` token and secret.
8. Install monitoring.

| Name | Value |
|---|---|
| Resource group, region | `rg-banking`, `centralindia` |
| Registry | `bankingshubham01` (Basic, admin disabled) |
| Key Vault | `kv-ledgerlab-shubham` (RBAC, soft delete 90 days, purge protection) |
| Key Vault secrets | `postgres-password`, `acr-pull-username`, `acr-pull-password`, `grafana-admin-password` |
| VM | `vm-ledgerlab`, Ubuntu 24.04, `Standard_B2s_v2`, 64 GB Standard SSD, user `azureuser`, key login only |
| GitHub app (push) | `github-banking-ci`, credential subject `repo:B0TL0F@121419078/Practise@1463216847:ref:refs/heads/main` |
| Pull app | `sp-banking-acr-pull` |
| GitHub variables | `ACR_NAME`, `ACR_LOGIN_SERVER`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` |
| Pinned versions | Argo CD chart `10.18.3`, External Secrets chart `2.15.0`, kube-prometheus-stack `93.9.0` |

## Things to know before you rebuild

- `AZURE_CLIENT_ID` changes every time the Entra app is recreated. Update the GitHub variable.
- The manifests pin image tags. After a rebuild the registry is empty, so run **Build** from `main`, then change the four tags in `deploy/k3s/dev/*-deployment.yaml` to the SHA it published.
- `Standard_B2ms` had no capacity in Central India. `Standard_B2s_v2` has the same 2 vCPU and 8 GB.
- The OIDC credential trusts only the `main` branch. Run the workflow from `main`.
- On Windows Git Bash, prefix `az` commands that take `/subscriptions/...` paths with `MSYS_NO_PATHCONV=1`.
- Windows OpenSSH rejects a `.pem` that others can read. Fix with `icacls <key> /inheritance:r` and `icacls <key> /grant:r "%USERNAME%:(R)"`.
- `gh secret set` needs the value on standard input. In PowerShell, run `Get-Clipboard | gh secret set DEPLOY_PR_TOKEN -R B0TL0F/Practise`.
- The payments image build once failed on a Maven Central rate limit. Rerun the failed job.
- Use a different SSH or HTTP source IP if your internet provider changes your address.

## Next steps

1. Rebuild the environment, then install monitoring from `deploy/monitoring` (see the header of `values.yaml`). Add `grafana-admin-password` to Key Vault first.
2. Expose application metrics. The Java services only publish `health` and `info`. Add `micrometer-registry-prometheus`, expose the `prometheus` endpoint, and add a `ServiceMonitor`.
3. Add a post-deploy smoke test and Argo CD notifications for `Degraded` applications.
4. Add automatic rollback with monitoring plus Argo Rollouts.
5. Add image scanning before publishing and a PROD approval step.
6. Replace the personal access token with a GitHub App, and restrict Key Vault network access.

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

The frontend calls relative `/api` routes. The K3s Ingress routes `/api/accounts`, `/api/payments`, and `/api/transactions` to the matching services and everything else to Nginx, for the host `ledgerlab.test`. The Vite development server forwards `/api` to `http://127.0.0.1:8088`. Provide an API gateway at that address or update the proxy for local development.

The payments schema is in `services/payments-service/src/main/resources/schema.sql`.

## Application checks

With Java 21 and Maven installed, run `mvn test` in each service directory. With Node.js and npm installed, run `npm install` and `npm run build` in `web-ui/`.
