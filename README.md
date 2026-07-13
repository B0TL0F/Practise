# Practise: 3-Tier DevOps Pipeline (CI → KIND → ArgoCD → Terraform/EKS)

A resume/portfolio project demonstrating a full DevOps pipeline on a 3-tier application (React UI + Express API + PostgreSQL), practiced first entirely for free/local, then once against real AWS infrastructure within a $115 free-tier credit budget.

## Architecture

```
                ┌─────────────┐        ┌─────────────┐        ┌──────────────┐
   git push --> │GitHub Actions│ build/test│  ghcr.io   │ pull  │  Kubernetes  │
                │     (CI)     │ ------->  │ (registry) │------>│ (KIND / EKS) │
                └─────────────┘           └─────────────┘        └──────┬───────┘
                                                                          │
                                          ArgoCD watches git, syncs manifests
                                                                          │
                                                                    ┌─────▼─────┐
                                                                    │ ui (React)│
                                                                    │  -> api   │
                                                                    │  -> pg    │
                                                                    └───────────┘
```

- **CI**: `.github/workflows/ci.yml` — lints/tests `apps/ui` and `apps/api`, builds Docker images, pushes to `ghcr.io` on every push to `main`.
- **Local cluster**: KIND (`kind-config.yaml`) — free, fast iteration loop for Kubernetes manifests.
- **GitOps**: ArgoCD (`argocd/`) — watches this repo, auto-syncs `k8s/overlays/kind` (and later `k8s/overlays/eks`) into the cluster.
- **Cloud infra**: Terraform (`terraform/`) — minimal VPC + EKS module, applied on-demand and destroyed immediately after each practice session to stay within the free-tier budget. See `terraform/README.md` for the cost breakdown and guardrails.

## What this project practices

1. Writing a real CI pipeline (test → build → push to a container registry) with GitHub Actions.
2. Structuring Kubernetes manifests with Kustomize base/overlay separation for multiple environments.
3. Running and debugging a full 3-tier app (stateful Postgres + API + UI) locally in KIND.
4. GitOps deployment with ArgoCD — git as the single source of truth, automated sync + self-heal.
5. Infrastructure as Code with Terraform, using community modules (`terraform-aws-modules/vpc`, `terraform-aws-modules/eks`) to provision a real EKS cluster.
6. Cost-conscious cloud usage — reasoning about what's billed hourly (control plane, nodes, NAT gateway, load balancers) and designing the module + workflow to minimize spend on a constrained budget.

## Reproduce it

### 1. Run the app locally (no Kubernetes)

```bash
# terminal 1
docker run -d --name postgres -e POSTGRES_USER=appuser -e POSTGRES_PASSWORD=apppass -e POSTGRES_DB=appdb -p 5432:5432 postgres:16-alpine
cd apps/api && npm install && npm start

# terminal 2
cd apps/ui && npm install && npm run dev
```

### 2. CI

Fork/push this repo to GitHub — the workflow at `.github/workflows/ci.yml` runs automatically. Update the image references in `k8s/base/*-deployment.yaml` and `argocd/application-*.yaml` from `ghcr.io/b0tl0f/...` to your GitHub username/repo.

### 3. Local Kubernetes (KIND)

```bash
kind create cluster --config kind-config.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl apply -k k8s/overlays/kind
kubectl -n practise get pods -w
# visit http://localhost:8080
```

### 4. ArgoCD (on KIND first)

See `argocd/README.md` for install + sync steps, and for how to demo the GitOps auto-sync loop.

### 5. AWS EKS via Terraform (on-demand only)

See `terraform/README.md` — **always `terraform destroy` after each session** to avoid burning through the free-tier credit. Once the cluster is up, repeat the ArgoCD install/sync pointed at `k8s/overlays/eks` and `argocd/application-eks.yaml`, verify the app is reachable via the LoadBalancer, then tear everything down.
