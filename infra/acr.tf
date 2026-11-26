resource "azurerm_container_registry" "acrbanking" {
  name                = "bankingshubham01"
  resource_group_name = azurerm_resource_group.rgbanking.name
  location            = azurerm_resource_group.rgbanking.location
  sku                 = "Basic"
  admin_enabled       = false
}