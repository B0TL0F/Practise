resource "azurerm_resource_group" "rgbanking" {
  name     = "rg-banking"
  location = var.location
}