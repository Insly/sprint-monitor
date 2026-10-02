locals {
  tags = {
    Project   = var.project
    Owner     = var.owner_email
    ManagedBy = "opentofu"
    Repo      = var.github_repo
  }
}

# Data lives here: S3 site bucket, access-log bucket, deploy role, budget.
provider "aws" {
  region = var.region

  default_tags {
    tags = local.tags
  }
}

# CloudFront's control plane is global but pinned to us-east-1:
# the ACM certificate and the Lambda@Edge function MUST be created there.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.tags
  }
}

data "aws_caller_identity" "current" {}
