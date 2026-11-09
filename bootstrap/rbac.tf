data "azurerm_client_config" "current" {
}

output "account_id" {
  value = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "Bootstrap_Storage_Contributor" {
  scope                = azurerm_storage_container.Container_Bootstrap.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}
