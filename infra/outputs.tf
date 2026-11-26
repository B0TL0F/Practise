output "acrbankingname" {
  value       = azurerm_container_registry.acrbanking.login_server
  description = "login servers"
}

output "clientidbanking" {
  value       = azuread_application_registration.github.client_id
  description = "client ID"
}