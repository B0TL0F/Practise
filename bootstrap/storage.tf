resource "azurerm_storage_account" "Storage_Bootstrap" {
  name                     = var.Bootstrap_Storage_Account
  resource_group_name      = azurerm_resource_group.RG_Bootstrap.name
  location                 = azurerm_resource_group.RG_Bootstrap.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "Container_Bootstrap" {
  name                  = var.Bootstrap_Container
  storage_account_id    = azurerm_storage_account.Storage_Bootstrap.id
  container_access_type = "private"
}