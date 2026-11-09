resource "azurerm_virtual_network" "VNET_PocketShop" {
  name                = "pocketshop-vnet"
  location            = azurerm_resource_group.RG_PocketShop.location
  resource_group_name = azurerm_resource_group.RG_PocketShop.name
  address_space       = ["10.0.0.0/16"]
  tags = {
    environment = "DEV"
  }
}

resource "azurerm_subnet" "SUBNET_PocketShop" {
  name                 = "pocketshop-subnet"
  resource_group_name  = azurerm_resource_group.RG_PocketShop.name
  virtual_network_name = azurerm_virtual_network.VNET_PocketShop.name
  address_prefixes     = ["10.0.1.0/24"]
}
