resource "azurerm_user_assigned_identity" "github_ci" {
  location            = azurerm_resource_group.RG_PocketShop.location
  name                = "pocket-shop-github-ci"
  resource_group_name = azurerm_resource_group.RG_PocketShop.name
}

resource "azurerm_federated_identity_credential" "github_main" {
  name                      = "github-practise-main"
  user_assigned_identity_id = azurerm_user_assigned_identity.github_ci.id

  issuer   = "https://token.actions.githubusercontent.com"
  audience = ["api://AzureADTokenExchange"]
  subject  = "repo:B0TL0F@121419078/Practise@1447050707:ref:refs/heads/main"
}

resource "azurerm_role_assignment" "github_acr_push" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.github_ci.principal_id
}