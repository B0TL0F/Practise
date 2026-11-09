resource "azurerm_resource_group" "RG_Bootstrap" {
  name     = var.Bootstrap_RG
  location = var.Bootstrap_RG_location
}
