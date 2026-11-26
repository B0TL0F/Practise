resource "azuread_application_registration" "github" {
  display_name     = "github-banking-ci"
  sign_in_audience = "AzureADMyOrg"
}

resource "azuread_service_principal" "github" {
  client_id = azuread_application_registration.github.client_id
}

resource "azuread_application_federated_identity_credential" "github" {
  application_id = azuread_application_registration.github.id
  display_name   = "github-practise-main"
  description    = "application registration"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:B0TL0F@121419078/Practise@1463216847:ref:refs/heads/main"
}

resource "azurerm_role_assignment" "github" {
  scope                = azurerm_container_registry.acrbanking.id
  role_definition_name = "AcrPush"
  principal_id         = azuread_service_principal.github.object_id
}