# Define Terraform configuration including required providers and versions
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.10"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
  
  # Backend configuration for state storage
  backend "s3" {
    bucket         = var.terraform_state_bucket
    key            = "refunds-service/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = var.terraform_lock_table
  }
}

# Primary AWS provider configuration (US region)
provider "aws" {
  region = "us-east-1"
  
  # Use profiles for authentication if provided
  profile = var.aws_profile != "" ? var.aws_profile : null
  
  default_tags {
    tags = {
      Environment = var.environment
      Service     = "refunds-service"
      ManagedBy   = "terraform"
    }
  }
}

# Secondary AWS provider for EU region
provider "aws" {
  alias  = "eu"
  region = "eu-west-1"
  
  # Use profiles for authentication if provided
  profile = var.aws_profile != "" ? var.aws_profile : null
  
  default_tags {
    tags = {
      Environment = var.environment
      Service     = "refunds-service"
      ManagedBy   = "terraform"
      Region      = "eu"
    }
  }
}

# Secondary AWS provider for APAC region
provider "aws" {
  alias  = "apac"
  region = "ap-southeast-1"
  
  # Use profiles for authentication if provided
  profile = var.aws_profile != "" ? var.aws_profile : null
  
  default_tags {
    tags = {
      Environment = var.environment
      Service     = "refunds-service"
      ManagedBy   = "terraform"
      Region      = "apac"
    }
  }
}

# MongoDB Atlas provider configuration
provider "mongodbatlas" {
  public_key  = var.mongodb_atlas_public_key
  private_key = var.mongodb_atlas_private_key
}