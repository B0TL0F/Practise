resource "azurerm_container_registry" "acr" {
  name                = var.ACR_name
  resource_group_name = azurerm_resource_group.RG_PocketShop.name
  location            = azurerm_resource_group.RG_PocketShop.location
  sku                 = "Basic"
  admin_enabled       = false
}
