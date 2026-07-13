# ArgoCD Setup

## Install ArgoCD (either cluster)

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd rollout status deploy/argocd-server
```

Get the initial admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

Port-forward the UI:

```bash
kubectl -n argocd port-forward svc/argocd-server 8080:443
```

## Register the app

Update `repoURL` in `application-kind.yaml` / `application-eks.yaml` to point at your fork, then:

```bash
# on KIND
kubectl apply -f argocd/application-kind.yaml

# on EKS (after terraform apply + kubeconfig configured)
kubectl apply -f argocd/application-eks.yaml
```

ArgoCD will sync automatically (`automated: prune+selfHeal`). To test the GitOps loop: edit an image tag or replica count under `k8s/overlays/kind/`, commit, push, and watch ArgoCD reconcile it without any `kubectl apply`.
