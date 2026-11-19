# Azure bootstrap

This configuration manages the Azure resource group, Basic ACR, Entra app registration and service principal, GitHub OIDC credential, and registry-scoped publisher role. Its output supplies the GitHub Actions repository variables.

## Create from scratch

Use an Azure CLI account with access to the target subscription and permission to create Entra applications and registry role assignments. Select the subscription with `az account set` and set `subscription_id`, `tenant_id`, and `github_oidc_subject` in an ignored local `terraform.tfvars` file. For B0TL0F/Practise, the previously configured subject was `repo:B0TL0F@121419078/Practise@1463216847:ref:refs/heads/main`. Use the subject emitted by the target repository if it differs. The subscription must have the `Microsoft.ContainerRegistry` resource provider registered.

From this directory, run:

```sh
terraform init
terraform plan -out=recreate.tfplan
terraform apply recreate.tfplan
terraform output -json github_actions_variables
```

For an empty environment, the plan should show six additions and zero changes or deletions. After applying, sync the output values to GitHub under **Settings → Secrets and variables → Actions → Variables**. A recreated Entra application has a new `AZURE_CLIENT_ID`. Rerun a push-to-main publishing workflow and verify all four SHA-tagged images in the recreated registry before deploying DEV.

## Adopt an existing bootstrap

Use the existing subscription and tenant IDs. Confirm the resource group name and region in the portal. The configuration assumes the group and registry share a region. Set `acr_permissions_mode` to `LegacyRegistryPermissions` for RBAC Registry Permissions or `AbacRepositoryPermissions` for RBAC + ABAC. Copy the exact Entra credential subject into `github_oidc_subject`, including any numeric IDs. Confirm the app and credential names match the portal.

To adopt the live setup, use an Azure CLI account with access to the subscription and Entra objects. Run the following from this directory. Replace every placeholder with the corresponding existing Azure ID. Import records existing resources in Terraform state.

```sh
az login
az account set --subscription '<subscription-id>'
terraform init
terraform import azurerm_resource_group.shared '/subscriptions/<subscription-id>/resourceGroups/<group>'
terraform import azurerm_container_registry.banking '/subscriptions/<subscription-id>/resourceGroups/<group>/providers/Microsoft.ContainerRegistry/registries/bankingbotlofacr'
terraform import azuread_application_registration.github '/applications/<app-registration-object-id>'
terraform import azuread_service_principal.github '/servicePrincipals/<enterprise-application-object-id>'
terraform import azuread_application_federated_identity_credential.main '<app-registration-object-id>/federatedIdentityCredential/<credential-id>'
terraform import azurerm_role_assignment.github_publish '<registry-resource-id>/providers/Microsoft.Authorization/roleAssignments/<assignment-id>'
terraform plan
```

Set the required variables in a local `terraform.tfvars` before running the imports. The app registration object ID and enterprise application object ID refer to different objects. Use the full Azure role assignment resource ID for the final import.

Review the plan and reconcile any differences with the portal before applying. For adoption, aim for zero resource changes. Keep Terraform state local or in an access-controlled backend.
