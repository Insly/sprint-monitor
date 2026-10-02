output "site_bucket" {
  description = "GitHub repository variable S3_BUCKET."
  value       = aws_s3_bucket.site.bucket
}

output "cloudfront_distribution_id" {
  description = "GitHub repository variable CF_DISTRIBUTION_ID."
  value       = aws_cloudfront_distribution.site.id
}

output "deploy_role_arn" {
  description = "GitHub repository variable AWS_ROLE_ARN."
  value       = aws_iam_role.deploy.arn
}

output "aws_region" {
  description = "GitHub repository variable AWS_REGION."
  value       = var.region
}

output "cloudfront_domain_name" {
  description = "Works before the friendly hostname exists (dry run). Target of the CNAME IT creates."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_url" {
  value = local.custom_domain ? "https://${var.domain_name}/" : "https://${aws_cloudfront_distribution.site.domain_name}/"
}

output "entra_redirect_uris" {
  description = "Ask IT to register these as Web redirect URIs on the Entra app registration."
  value = compact([
    "https://${aws_cloudfront_distribution.site.domain_name}/_auth/callback",
    local.has_domain ? "https://${var.domain_name}/_auth/callback" : "",
  ])
}

output "acm_validation_records" {
  description = "External DNS only: CNAMEs IT must create so ACM can issue the certificate."
  value = [
    for o in flatten(aws_acm_certificate.site[*].domain_validation_options) : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ]
}

output "dns_record_for_it" {
  description = "External DNS only: the record that points the friendly hostname at CloudFront."
  value       = local.has_domain && !local.use_route53 ? "${var.domain_name}. CNAME ${aws_cloudfront_distribution.site.domain_name}." : null
}

output "auth_secret_parameter" {
  description = "SSM SecureString (us-east-1) to fill once with the Entra client secret and a cookie key."
  value       = aws_ssm_parameter.edge_auth.name
}
