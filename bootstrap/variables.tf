variable "Bootstrap_RG" {
  description = "Name of the resource group for bootstrap"
  type        = string
}

variable "Bootstrap_RG_location" {
  description = "Location of the resource group"
  type        = string
}

variable "Bootstrap_Storage_Account" {
  description = "Name of the storage account for bootstrap"
  type        = string
}

variable "Bootstrap_Container" {
  description = "Name of the Container for bootstrap"
  type        = string
  default     = "tfstate"
}