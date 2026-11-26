# LedgerLab Banking Application

A sample banking application with a React dashboard, three Java Spring Boot services, and a PostgreSQL database. It uses synthetic demo data. It is also a DevOps practice project: the delivery pipeline, Kubernetes manifests, and cloud setup are built step by step on top of this code.

## Current state

This repository is a learning rebuild of a complete DevOps setup. The application code and Dockerfiles are done. The Azure infrastructure is being rebuilt step by step with Terraform on the branch `terraform-iac`, written by hand to learn it. A first CI workflow that builds the images is in place; there is no publishing or deployment yet. **Nothing is running in Azure and nothing is billing.**

A finished version of the whole setup is kept as the git tag `reference-complete`. It is for reference only. To browse it:

```sh
git fetch --tags
git checkout reference-complete      # read-only view; return with: git checkout main
```

It contains the Azure setup runbook (`docs/azure-vm-setup.md`), K3s manifests, Argo CD Application, Key Vault wiring, monitoring configuration, and the full CI/CD workflow.

## Progress checkpoint (2026-11-26)

| Stage | What | State |
|---|---|---|
| 0 | Azure resource providers registered (`ContainerRegistry`, `Compute`, `Network`, `KeyVault`) | Done. A one-time setting on the subscription that survives teardown. |
| 1 | Terraform skeleton and resource group `rg-banking` (`versions.tf`, `variables.tf`, `main.tf`) | Done. |
| 2 | Container registry (`acr.tf`) and login server output (`outputs.tf`) | Done. |
| 3a | GitHub passwordless login (`github.tf`): app registration, service principal, federated credential, `AcrPush` on the registry only | Done. All 6 resources were applied with no drift, then destroyed. |
| 3b | `.github/workflows/ci.yaml`, job `validate`: builds all four images | Done. All four passed on pull request #19. |
| 3c | `ci.yaml`, job `publish`: push the images to the registry | **Not written. Do this next.** |
| 4 | Key Vault, pull-only identity, secrets | Not started. |
| 5 | Network, firewall limited to your IP, VM with managed identity, vault read role | Not started. |
| 6 | K3s, Helm, External Secrets, Argo CD on the VM | Not started. |
| 7 | Kubernetes manifests, written by hand | Not started. |
| 8 | CD: tag-bump pull requests | Not started. |
| 9 | Monitoring with Prometheus and Grafana | Not started. |
| 10 | Remote Terraform state in Azure Storage, Terraform in CI | Not started. |

Pull request #19 (`terraform-iac` into `main`) is open. Do not merge it until `publish` is written and reviewed and the steps under "Next steps" are done. The finished reference of stages 3 to 9 is in the git tag `reference-complete`. It was built with the Azure CLI, not Terraform, and it is a read-only reference.

## Next steps

### 1. Write the `publish` job

| Part | Requirement |
|---|---|
| When jobs run | `validate` runs only for pull requests. `publish` runs only for a push to `main`, or a manual run on `main`. Look up `if:` and the `github` context. |
| Permissions | Read the repository contents, and allow the job to request an OIDC token. |
| Matrix | Four entries, each with an image name and its folder. Look up matrix `include`. |
| Step 1 | Check out the code. |
| Step 2 | Build with `docker/build-push-action`, tagged `<registry address>/<image name>:<commit SHA>`, and keep the image on the runner (`load` input). |
| Step 3 | Log in with `azure/login` using the client, tenant and subscription IDs from repository variables. |
| Step 4 | Log in to the registry with an `az acr` command. |
| Step 5 | `docker push` the same full image name. |

Questions to be able to answer: Why tag with the commit SHA instead of `latest`? Why does the job need no password? Why must it not run for pull requests?

### 2. Test it

1. Review the workflow before committing.
2. In `infra/`, run `terraform plan`, then `terraform apply`. The registry bills while it exists.
3. Set the repository variable `AZURE_CLIENT_ID` to the new `terraform output clientidbanking` value. It changes every time the app registration is recreated.
4. Commit, push, check that `validate` passes, and merge pull request #19. The federated credential trusts only `main`, so `publish` can only be tested there.
5. Check that the four images are in the registry.

## GitHub repository variables

Set under **Settings → Secrets and variables → Actions → Variables**. No secrets are needed yet.

| Variable | Source |
|---|---|
| `ACR_NAME` | The registry name |
| `ACR_LOGIN_SERVER` | `terraform output acrbankingname` |
| `AZURE_CLIENT_ID` | `terraform output clientidbanking`. Update after every fresh apply. |
| `AZURE_TENANT_ID` | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | `az account show --query id -o tsv` |

## Continue on another device

1. Install the Azure CLI, Terraform (1.9 or newer), Git, and the GitHub CLI.
2. Clone the repository and check out the working branch:
   ```sh
   git clone https://github.com/B0TL0F/Practise.git && cd Practise
   git checkout terraform-iac
   ```
3. Sign in and select the subscription:
   ```sh
   az login
   az account show --query "{subscription:id, tenant:tenantId}" -o json
   ```
4. If it is a new subscription, register the providers once (they print nothing on success):
   ```sh
   az provider register -n Microsoft.ContainerRegistry --wait
   az provider register -n Microsoft.Compute --wait
   az provider register -n Microsoft.Network --wait
   az provider register -n Microsoft.KeyVault --wait
   ```
5. In `infra/`, create the git-ignored `terraform.tfvars` with `subscription_id` and `tenant_id` from step 3, then run `terraform init`, `terraform validate`, and `terraform plan`. With the current code, a fresh plan should show 6 resources to add. Creating the app registration and role assignment needs permission to register applications and assign roles.
6. Continue with "Next steps" above.

Terraform state is local and git-ignored, so each device starts with empty state. Always destroy before moving to another device, or move the state to a remote backend (Stage 10) first. Otherwise Terraform will try to create resources that already exist.

## Values to reuse

| Item | Value |
|---|---|
| Resource group, region | `rg-banking`, `centralindia` |
| Registry name | Must be globally unique, lowercase letters and digits. `bankingshubham01` was used before. |
| GitHub owner and repository IDs, for the OIDC subject | `121419078` and `1463216847`. Subject: `repo:B0TL0F@121419078/Practise@1463216847:ref:refs/heads/main` |
| VM size | `Standard_B2s_v2`. `Standard_B2ms` had no capacity in Central India. |
| Key Vault | The old vault `kv-ledgerlab-shubham` is soft-deleted with purge protection until about 2027-02-23, and its name is reserved. Choose a new name, or recover that vault. |
| Firewall | Allow SSH and HTTP only from your own public IP. |

## Working agreement

This project is for learning and interview practice, so the project owner writes every Terraform, Kubernetes, and workflow file. An assistant should:

- explain concepts in simple language and say why each piece exists;
- describe what a file must achieve and where to look in the docs, and **not paste the file contents** unless asked;
- review the files that were written, and run read-only checks (`terraform validate`, `terraform plan`, `az ... show`, `kubectl get`) when asked to "check";
- read the plan before any apply, and ask before creating billable resources or changing repository protection.

## Lessons learned

- A resource's local name in Terraform is part of its address. Choose it before the first apply, because renaming later needs a `moved` block or `terraform state mv`.
- `terraform apply` with no changes does nothing. That property is called idempotence.
- Terraform state can contain secrets. Never commit it, and move it to an encrypted remote backend for team use.
- A Key Vault with purge protection survives `terraform destroy` as soft-deleted, and its name stays reserved.
- A required status check that comes from a deleted workflow can never pass, so a pull request that deletes the workflow cannot merge. Remove the rule first.
- The payments image build can fail with a Maven Central rate limit (HTTP 429). Rerun the failed job.
- On Windows Git Bash, prefix `az` commands that take `/subscriptions/...` paths with `MSYS_NO_PATHCONV=1`.
- Windows OpenSSH rejects a `.pem` that other users can read. Fix it with `icacls <key> /inheritance:r` and `icacls <key> /grant:r "%USERNAME%:(R)"`.

## Branch protection

`main` currently has no ruleset. Once the delivery pipeline is on `main`, add a ruleset in **Settings → Rules → Rulesets** that requires a pull request and the pipeline's checks, and blocks deletions and force pushes.

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
