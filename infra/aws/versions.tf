# OpenTofu skeleton for the MGA Sprint Board on AWS. NOT APPLIED.
# See README.md in this folder and docs/aws/MIGRATION.md.

terraform {
  required_version = ">= 1.10.0" # OpenTofu 1.10+ (native S3 state locking via use_lockfile)

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }

  # First apply: local state (leave this commented out).
  # Afterwards: create the state bucket once (README.md), uncomment, run `tofu init -migrate-state`.
  # backend "s3" {
  #   bucket       = "insly-sprint-monitor-tfstate"
  #   key          = "sprint-monitor/aws.tfstate"
  #   region       = "eu-north-1"
  #   encrypt      = true
  #   use_lockfile = true # S3-native lock file; no DynamoDB table needed on OpenTofu >= 1.10
  # }
}
