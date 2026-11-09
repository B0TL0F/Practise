terraform {
  backend "azurerm" {
    resource_group_name  = "PocketShopBootstrapRG"
    storage_account_name = "pocketshopbootstrap"
    container_name       = "tfstate"
    key                  = "pocket-shop-dev.tfstate"
    use_azuread_auth        = true
  }
}