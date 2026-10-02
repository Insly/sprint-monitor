# TLS certificate for the friendly hostname. CloudFront only accepts ACM certs from us-east-1.
#
# Route53 path (route53_zone_id set): validation and alias records are created here, one apply.
# External DNS path (the likely case for insly.com): two applies.
#   1. apply with domain_name set, attach_custom_domain = false
#   2. IT creates the CNAMEs from the `acm_validation_records` output; wait for ISSUED
#   3. IT creates `<domain_name> CNAME <cloudfront_domain_name>`; apply with attach_custom_domain = true

resource "aws_acm_certificate" "site" {
  count    = local.has_domain ? 1 : 0
  provider = aws.us_east_1

  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = local.use_route53 ? {
    for o in flatten(aws_acm_certificate.site[*].domain_validation_options) : o.domain_name => o
  } : {}

  zone_id         = var.route53_zone_id
  name            = each.value.resource_record_name
  type            = each.value.resource_record_type
  records         = [each.value.resource_record_value]
  ttl             = 300
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  count    = local.use_route53 ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = one(aws_acm_certificate.site[*].arn)
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

locals {
  # With Route53 we wait for validation; with external DNS the operator only flips
  # attach_custom_domain after `aws acm describe-certificate` says ISSUED.
  certificate_arn = local.use_route53 ? one(aws_acm_certificate_validation.site[*].certificate_arn) : one(aws_acm_certificate.site[*].arn)
}

resource "aws_route53_record" "site_alias" {
  for_each = local.use_route53 && local.custom_domain ? toset(["A", "AAAA"]) : toset([])

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = each.value

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
