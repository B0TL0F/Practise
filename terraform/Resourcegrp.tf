resource "azurerm_resource_group" "RG_PocketShop" {
  name     = var.RG_name
  location = var.RG_location
}