output "github_client_id" {
  value = azurerm_user_assigned_identity.github_ci.client_id
}

output "github_tenant_id" {
  value = azurerm_user_assigned_identity.github_ci.tenant_id
}

output "acr_name" {
  value = azurerm_container_registry.acr.name
}

output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}