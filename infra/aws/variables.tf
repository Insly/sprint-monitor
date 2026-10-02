variable "project" {
  description = "Short name used in resource names and the Project cost tag."
  type        = string
  default     = "sprint-monitor"
}

variable "owner_email" {
  description = "Owner tag value (who to ask about these resources)."
  type        = string
}

variable "region" {
  description = "Region for the S3 buckets and IAM-adjacent resources. EU only: eu-north-1 or eu-central-1."
  type        = string
  default     = "eu-north-1"

  validation {
    condition     = contains(["eu-north-1", "eu-central-1"], var.region)
    error_message = "Use eu-north-1 or eu-central-1 (EU data)."
  }
}

variable "site_bucket_name" {
  description = "Globally unique S3 bucket name for the site files."
  type        = string
  default     = "insly-sprint-monitor-site"
}

variable "log_bucket_name" {
  description = "Globally unique S3 bucket name for CloudFront access logs."
  type        = string
  default     = "insly-sprint-monitor-logs"
}

variable "access_log_retention_days" {
  description = "CloudFront access logs contain client IPs (personal data); keep them short."
  type        = number
  default     = 90
}

variable "noncurrent_version_retention_days" {
  description = "How long old object versions are kept (the S3-level rollback window)."
  type        = number
  default     = 90
}

variable "price_class" {
  description = "PriceClass_100 = edges in Europe and North America only (cheapest, keeps processing out of other regions)."
  type        = string
  default     = "PriceClass_100"
}

# --- Hostname -----------------------------------------------------------------

variable "domain_name" {
  description = "Friendly hostname chosen by owner/IT, e.g. sprint.insly.com. Empty = no certificate yet."
  type        = string
  default     = ""
}

variable "attach_custom_domain" {
  description = "Attach domain_name to CloudFront. Set true only after the ACM certificate is ISSUED (DNS validation done)."
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for the parent domain, if AWS hosts it. Empty = DNS is external (IT adds records by hand from the outputs)."
  type        = string
  default     = ""
}

# --- Entra ID sign-in ---------------------------------------------------------

variable "entra_tenant_id" {
  description = "Insly's Microsoft Entra tenant ID (GUID). Only accounts from this tenant are accepted."
  type        = string
}

variable "entra_client_id" {
  description = "Application (client) ID of the Entra app registration IT creates for the Sprint Board."
  type        = string
}

variable "session_hours" {
  description = "Lifetime of the Sprint Board session cookie. On Entra-joined laptops renewal is a silent redirect; a disabled account loses access within this window."
  type        = number
  default     = 12

  validation {
    condition     = var.session_hours >= 1 && var.session_hours <= 168
    error_message = "session_hours must be between 1 and 168 (7 days)."
  }
}

# --- GitHub deploy ------------------------------------------------------------

variable "github_repo" {
  description = "owner/name of the repository allowed to deploy."
  type        = string
  default     = "Insly/sprint-monitor"
}

variable "github_environment" {
  description = "GitHub environment the deploy job runs in. The role trusts only this environment (restrict it to the main branch in repo settings)."
  type        = string
  default     = "aws-production"
}

variable "create_github_oidc_provider" {
  description = "false if the AWS account already has the token.actions.githubusercontent.com OIDC provider (only one per account)."
  type        = bool
  default     = true
}

# --- Cost ---------------------------------------------------------------------

variable "budget_limit_usd" {
  description = "Monthly budget. Expected spend is about 1 USD; anything near this limit means something is wrong."
  type        = number
  default     = 10
}

variable "budget_emails" {
  description = "Who gets the budget alerts (owner + one backup)."
  type        = list(string)
}

variable "budget_filter_by_tag" {
  description = "true when the account is shared with other workloads: scope the budget to Project=<project> (activate the Project cost-allocation tag first)."
  type        = bool
  default     = false
}
