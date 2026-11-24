# Rebuild runbook

These are the commands that built the environment and were verified end to end on 2026-11-24. Run them from Bash (Git Bash, WSL, or Azure Cloud Shell) with the Azure CLI and the GitHub CLI signed in. Replace `<...>` placeholders. Every step can also be done in the Azure portal.

Windows Git Bash: run `export MSYS_NO_PATHCONV=1` first so paths such as `/subscriptions/...` are not rewritten.

```sh
az login && az account set --subscription <subscription-id>
gh auth login
```

## 1. Resource group and registry

```sh
az provider register -n Microsoft.ContainerRegistry --wait
az group create -n rg-banking -l centralindia
az acr create -n bankingshubham01 -g rg-banking -l centralindia --sku Basic --admin-enabled false
```

The admin user stays off. Access is by identity and role.

## 2. GitHub signs in to Azure (push access)

```sh
APPID=$(az ad app create --display-name github-banking-ci --query appId -o tsv)
az ad sp create --id $APPID
az ad app federated-credential create --id $APPID --parameters '{
  "name":"github-practise-main",
  "issuer":"https://token.actions.githubusercontent.com",
  "subject":"repo:B0TL0F@121419078/Practise@1463216847:ref:refs/heads/main",
  "audiences":["api://AzureADTokenExchange"]}'
sleep 25   # let the new service principal replicate
ACR_ID=$(az acr show -n bankingshubham01 -g rg-banking --query id -o tsv)
az role assignment create --assignee $APPID --role AcrPush --scope "$ACR_ID"

R=B0TL0F/Practise
gh variable set ACR_NAME -b bankingshubham01 -R $R
gh variable set ACR_LOGIN_SERVER -b bankingshubham01.azurecr.io -R $R
gh variable set AZURE_CLIENT_ID -b $APPID -R $R
gh variable set AZURE_TENANT_ID -b <tenant-id> -R $R
gh variable set AZURE_SUBSCRIPTION_ID -b <subscription-id> -R $R

gh workflow run Build --ref main -R $R     # publishes the four images
```

The subject uses the numeric owner and repository IDs, which is what the portal generates. Run the workflow from `main`, because the credential trusts only that branch. When the run finishes, note its commit SHA and confirm the tags:

```sh
for r in accounts-service payments-service transactions-service web-ui; do
  az acr repository show-tags -n bankingshubham01 --repository $r -o tsv
done
```

## 3. Key Vault and the pull-only identity

The vault was deleted with purge protection, so it is recoverable until about 2027-02-22 and its name is reserved. Recover it. After that date, create a new one with RBAC authorization, soft delete, and purge protection.

```sh
az keyvault recover -n kv-ledgerlab-shubham
KVID=$(az keyvault show -n kv-ledgerlab-shubham --query id -o tsv)
ME=$(az ad signed-in-user show --query id -o tsv)
az role assignment create --assignee-object-id $ME --assignee-principal-type User \
  --role "Key Vault Secrets Officer" --scope "$KVID"
```

Create the pull-only app and write its login straight into the vault. The password is never printed:

```sh
OUT=$(az ad sp create-for-rbac --name sp-banking-acr-pull --scopes "$ACR_ID" --role AcrPull \
      --query "[appId,password]" -o tsv)
U=$(echo "$OUT" | sed -n 1p); P=$(echo "$OUT" | sed -n 2p)
sleep 30   # role assignment needs a moment to apply
az keyvault secret set --vault-name kv-ledgerlab-shubham -n acr-pull-username --value "$U"
az keyvault secret set --vault-name kv-ledgerlab-shubham -n acr-pull-password --value "$P"
unset P OUT
```

`postgres-password` is already in the recovered vault. If it is missing, set it yourself with letters and digits only. Add `grafana-admin-password` before installing monitoring.

## 4. The VM

```sh
ssh-keygen -t ed25519 -N "" -C vm-ledgerlab -f vm-ledgerlab_key.pem   # *.pem is git-ignored
az vm create -g rg-banking -n vm-ledgerlab -l centralindia --image Ubuntu2404 \
  --size Standard_B2s_v2 --admin-username azureuser --ssh-key-values vm-ledgerlab_key.pem.pub \
  --os-disk-size-gb 64 --storage-sku StandardSSD_LRS --public-ip-sku Standard \
  --nsg-rule NONE --assign-identity '[system]'
```

If the size reports `SkuNotAvailable`, pick another 2 vCPU, 8 GB size. Note the printed public IP, then restrict the firewall to your own address and let the VM read the vault:

```sh
MYIP=$(curl -s https://api.ipify.org)
az network nsg rule create -g rg-banking --nsg-name vm-ledgerlabNSG -n Allow-SSH-myip \
  --priority 1000 --access Allow --protocol Tcp --direction Inbound --destination-port-ranges 22 --source-address-prefixes $MYIP
az network nsg rule create -g rg-banking --nsg-name vm-ledgerlabNSG -n Allow-HTTP-myip \
  --priority 1010 --access Allow --protocol Tcp --direction Inbound --destination-port-ranges 80 --source-address-prefixes $MYIP

VMID=$(az vm show -g rg-banking -n vm-ledgerlab --query identity.principalId -o tsv)
az role assignment create --assignee-object-id $VMID --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" --scope "$KVID"
```

On Windows, allow only your user to read the key before using PowerShell's `ssh`:

```powershell
icacls .\vm-ledgerlab_key.pem /inheritance:r
icacls .\vm-ledgerlab_key.pem /grant:r "${env:USERNAME}:(R)"
ssh -i .\vm-ledgerlab_key.pem azureuser@<vm-public-ip>
```

## 5. Software on the VM

Run on the VM:

```sh
sudo apt-get update && sudo apt-get install -y git
curl -sfL https://get.k3s.io | sudo sh -
mkdir -p ~/.kube && sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config && chmod 600 ~/.kube/config
echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc && export KUBECONFIG=~/.kube/config
sudo ln -sf /usr/local/bin/k3s /usr/local/bin/kubectl
kubectl get nodes                     # wait for Ready

curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

helm install external-secrets external-secrets/external-secrets --version 2.15.0 \
  -n external-secrets --create-namespace --set installCRDs=true --wait
helm install argocd argo/argo-cd --version 10.18.3 -n argocd --create-namespace --wait
```

K3s brings Traefik (the Ingress controller) and `local-path` storage.

## 6. Point the manifests at the published images

The registry was empty after the rebuild, so the pinned tags in `deploy/k3s/dev/*-deployment.yaml` do not exist yet. Use the SHA that step 2 published:

```sh
SHA=<full-40-character-commit-sha>
sed -i -E '/image:/s#:[0-9a-f]{40}$#:'"${SHA}"'#' deploy/k3s/dev/*-deployment.yaml
```

Commit this on a branch, open a pull request, and merge it. From then on the CI bot does this step for you.

## 7. Let Argo CD deploy

On the VM:

```sh
git clone https://github.com/B0TL0F/Practise.git && cd Practise
kubectl apply -f deploy/argocd/ledgerlab-dev.yaml
kubectl get application -n argocd -w      # wait for Synced and Healthy, then Ctrl+C
```

Verify:

```sh
kubectl get secretstore,externalsecret -n ledgerlab-dev    # Valid, SecretSynced
kubectl get pods -n ledgerlab-dev                          # all 1/1 Running
for p in / /api/accounts /api/transactions /api/payments; do
  curl -s -o /dev/null -w "$p %{http_code}\n" -H "Host: ledgerlab.test" http://localhost$p
done
```

`ImagePullBackOff` means the `acr-pull-*` vault values or the image tag are wrong.

To view the site from your PC, add `<vm-public-ip> ledgerlab.test` to `C:\Windows\System32\drivers\etc\hosts` (run the editor as administrator) and open `http://ledgerlab.test`.

## 8. Argo CD dashboard

```powershell
ssh -i .\vm-ledgerlab_key.pem -L 8080:localhost:8080 azureuser@<vm-public-ip>
```

On the VM, in that session:

```sh
kubectl port-forward svc/argocd-server -n argocd 8080:443
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
```

Open `https://localhost:8080` and sign in as `admin`. Accept the self-signed certificate.

## 9. Automatic tag-bump pull requests

Create a fine-grained personal access token limited to this repository, with **Contents: Read and write** and **Pull requests: Read and write**, and a 90-day expiry. Store it as a secret. In PowerShell, copy the token first:

```powershell
Get-Clipboard | & "C:\Program Files\GitHub CLI\gh.exe" secret set DEPLOY_PR_TOKEN -R B0TL0F/Practise
```

Or paste it at https://github.com/B0TL0F/Practise/settings/secrets/actions. Then merge a change to `main` and watch the **Build** workflow open a "Deploy ... to DEV" pull request.

## 10. Monitoring (not yet installed)

Files are in `deploy/monitoring`. After adding `grafana-admin-password` to Key Vault, run on the VM from a clone of this repository:

```sh
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts && helm repo update
kubectl create namespace monitoring
kubectl apply -f deploy/monitoring/secretstore.yaml -f deploy/monitoring/externalsecret-grafana.yaml
helm install monitoring prometheus-community/kube-prometheus-stack --version 93.9.0 \
  -n monitoring -f deploy/monitoring/values.yaml --wait --timeout 8m
kubectl port-forward svc/monitoring-grafana -n monitoring 3000:80
```

Sign in to Grafana as `admin` with the vault value of `grafana-admin-password`. The Java services do not expose Prometheus metrics yet. See the README's next steps.

## Teardown

```sh
az group delete -n rg-banking --yes
az ad app delete --id <github-banking-ci-app-id>
az ad app delete --id <sp-banking-acr-pull-app-id>
for v in ACR_NAME ACR_LOGIN_SERVER AZURE_CLIENT_ID AZURE_TENANT_ID AZURE_SUBSCRIPTION_ID; do
  gh variable delete $v -R B0TL0F/Practise; done
gh secret delete DEPLOY_PR_TOKEN -R B0TL0F/Practise
```

Deleting the resource group soft-deletes the Key Vault. Azure keeps it, with its secrets, until the purge date, so recover it on the next rebuild. Delete the local `vm-ledgerlab_key.pem`, because it belongs to the deleted VM. `NetworkWatcherRG` is created by Azure and is empty and free.
