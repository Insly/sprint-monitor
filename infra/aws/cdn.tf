locals {
  has_domain    = var.domain_name != ""
  use_route53   = local.has_domain && var.route53_zone_id != ""
  custom_domain = local.has_domain && var.attach_custom_domain

  # The page today has an inline <style> and an inline <script type="module">, so 'unsafe-inline'
  # is needed for both. Moving the script to public/app.js would let script-src drop it.
  # Links to insly.atlassian.net are navigations and need no CSP entry. Favicon is a data: URL.
  csp = join("; ", [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self'",
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ])
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.project}-site"
  description                       = "CloudFront to private S3 site bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Same freshness as on Render today: objects are uploaded with Cache-Control: no-cache, and with
# min/default TTL 0 CloudFront honours that and does not keep copies at the edge (also means the
# rota names are never cached at edge locations). max_ttl > 0 only so compression can be enabled.
resource "aws_cloudfront_cache_policy" "site" {
  name        = "${var.project}-honour-origin"
  comment     = "Honour origin Cache-Control (no-cache); gzip/brotli on"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 300

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true

    cookies_config {
      cookie_behavior = "none" # session cookie is read by Lambda@Edge, never sent to S3
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_response_headers_policy" "site" {
  name    = "${var.project}-security-headers"
  comment = "CSP, HSTS, nosniff, Referrer-Policy, frame-ancestors none"

  security_headers_config {
    content_security_policy {
      content_security_policy = local.csp
      override                = true
    }
    strict_transport_security {
      access_control_max_age_sec = 63072000 # 2 years
      include_subdomains         = false
      preload                    = false
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "no-referrer" # as today on Render
      override        = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=(), payment=()"
      override = true
    }
    items {
      header   = "Cross-Origin-Opener-Policy"
      value    = "same-origin"
      override = true
    }
    items {
      header   = "X-Robots-Tag"
      value    = "noindex, nofollow"
      override = true
    }
  }
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  comment             = "MGA Sprint Board (employee-only, Entra ID sign-in)"
  default_root_object = "index.html"
  price_class         = var.price_class
  aliases             = local.custom_domain ? [var.domain_name] : []

  origin {
    origin_id                = "s3-site"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id           = "s3-site"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.site.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id

    # Every viewer request (including /_auth/*) goes through the sign-in check first.
    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = aws_lambda_function.edge_auth.qualified_arn
      include_body = false
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = local.custom_domain ? false : true
    acm_certificate_arn            = local.custom_domain ? local.certificate_arn : null
    ssl_support_method             = local.custom_domain ? "sni-only" : null
    minimum_protocol_version       = local.custom_domain ? "TLSv1.2_2021" : "TLSv1"
  }

  logging_config {
    bucket          = aws_s3_bucket.logs.bucket_domain_name
    prefix          = "cloudfront/"
    include_cookies = false # never log the session cookie
  }

  lifecycle {
    precondition {
      condition     = !var.attach_custom_domain || var.domain_name != ""
      error_message = "attach_custom_domain = true needs domain_name."
    }
  }

  depends_on = [aws_s3_bucket_ownership_controls.logs]
}
