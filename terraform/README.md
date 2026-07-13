# Terraform: AWS EKS (on-demand, free-tier-budget)

This module is intentionally minimal to stay inside a **$115 AWS credit** budget. It is meant to be applied for a short practice session and destroyed immediately after — **do not leave it running**.

## Cost estimate (us-east-1, approximate)

| Resource | Rate | Notes |
|---|---|---|
| EKS control plane | ~$0.10/hr (~$73/mo if left running) | Billed regardless of node count |
| 2x t3.small on-demand nodes | ~$0.0208/hr each (~$0.0416/hr total) | Smallest practical size for ui+api+postgres pods |
| 1x NAT Gateway | ~$0.045/hr + data processing | Single NAT (not per-AZ) to cut cost |
| Data transfer / LB | Varies | LoadBalancer Service provisions an ELB/NLB — has its own hourly cost |

**Rough total: ~$0.19-0.25/hr (~$1.50-2/day if you forget to tear down).** A single practice session of a few hours costs well under $5. Running this continuously for a month would consume the entire $115 credit and then some — always destroy after each session.

## Usage

```bash
cd terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# point kubectl at the new cluster
$(terraform output -raw configure_kubeconfig)
kubectl get nodes

# ... practice ArgoCD / deploy the app / demo it ...

# IMPORTANT: tear down as soon as you're done
terraform destroy
```

## Cost guardrails already applied in this module

- No RDS — Postgres runs in-cluster (`k8s/base/postgres-statefulset.yaml`), avoiding a second billable managed database.
- Single NAT gateway instead of one per AZ.
- Smallest viable node type (`t3.small`) and count (2, min 1) — enough to schedule ui, api, and postgres pods with room for the ArgoCD/ALB controller add-ons.
- No Fargate profiles — EC2 managed node group is more cost-predictable for a short-lived cluster.

## After `terraform destroy`

Check the AWS Billing / Cost Explorer console to confirm no EKS, EC2, NAT Gateway, or ELB charges are still accruing. Also verify no orphaned `LoadBalancer`-type Kubernetes Services are left behind (they provision an ELB that Terraform won't know about) — run `kubectl get svc -A` before destroying and delete any `LoadBalancer` services first so the cloud load balancer is cleaned up.
