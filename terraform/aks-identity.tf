resource "azurerm_user_assigned_identity" "identity" {
  location            = azurerm_resource_group.RG_PocketShop.location
  name                = "pocketshop-aks-identity"
  resource_group_name = azurerm_resource_group.RG_PocketShop.name
}

resource "azurerm_role_assignment" "identity_role_assignment" {
  scope                = azurerm_subnet.SUBNET_PocketShop.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.identity.principal_id
}