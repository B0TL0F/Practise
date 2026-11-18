terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
  }
}

variable "subscription_id" {
  type = string
}

variable "tenant_id" {
  type = string
}

variable "resource_group_name" {
  type    = string
  default = "rg-banking-shared"
}

variable "location" {
  type    = string
  default = "centralindia"
}

variable "acr_permissions_mode" {
  type    = string
  default = "LegacyRegistryPermissions"

  validation {
    condition     = contains(["LegacyRegistryPermissions", "AbacRepositoryPermissions"], var.acr_permissions_mode)
    error_message = "Use LegacyRegistryPermissions or AbacRepositoryPermissions."
  }
}

variable "github_oidc_subject" {
  description = "Exact subject shown on the existing Entra federated credential."
  type        = string
}

provider "azurerm" {
  features {}
  subscription_id                 = var.subscription_id
  tenant_id                       = var.tenant_id
  resource_provider_registrations = "none"
}

provider "azuread" {
  tenant_id = var.tenant_id
}

resource "azurerm_resource_group" "shared" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_container_registry" "banking" {
  name                          = "bankingbotlofacr"
  resource_group_name           = azurerm_resource_group.shared.name
  location                      = var.location
  sku                           = "Basic"
  admin_enabled                 = false
  public_network_access_enabled = true
  role_assignment_mode          = var.acr_permissions_mode

  lifecycle {
    prevent_destroy = true
  }
}

resource "azuread_application_registration" "github" {
  display_name     = "github-banking-ci"
  sign_in_audience = "AzureADMyOrg"
}

resource "azuread_service_principal" "github" {
  client_id = azuread_application_registration.github.client_id
}

resource "azuread_application_federated_identity_credential" "main" {
  application_id = azuread_application_registration.github.id
  display_name   = "github-practise-main"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = var.github_oidc_subject
}

resource "azurerm_role_assignment" "github_publish" {
  scope                = azurerm_container_registry.banking.id
  role_definition_name = var.acr_permissions_mode == "AbacRepositoryPermissions" ? "Container Registry Repository Writer" : "AcrPush"
  principal_id         = azuread_service_principal.github.object_id
}

output "github_actions_variables" {
  value = {
    AZURE_CLIENT_ID       = azuread_application_registration.github.client_id
    AZURE_TENANT_ID       = var.tenant_id
    AZURE_SUBSCRIPTION_ID = var.subscription_id
    ACR_NAME              = azurerm_container_registry.banking.name
    ACR_LOGIN_SERVER      = azurerm_container_registry.banking.login_server
  }
}
