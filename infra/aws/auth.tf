# Entra ID sign-in at the edge: one Lambda@Edge function on viewer-request.
# Lambda@Edge rules: created in us-east-1, published version, no environment variables
# (so non-secret config is baked into the zip as config.json), 5 s max on viewer events.

locals {
  edge_function_name = "${var.project}-edge-auth"
  secret_param_name  = "/${var.project}/edge-auth"
}

# Secrets (Entra client secret + cookie signing key) live in SSM Parameter Store, NOT in
# tofu state or the zip. Tofu creates the parameter with a placeholder; the operator sets the
# real value once with the CLI (README.md). The function refuses to start while the
# placeholder is there (fails closed: 503, nobody gets in).
resource "aws_ssm_parameter" "edge_auth" {
  provider = aws.us_east_1

  name        = local.secret_param_name
  description = "Sprint Board edge auth: {\"clientSecret\":\"...\",\"cookieKey\":\"...\"}"
  type        = "SecureString"
  value       = jsonencode({ clientSecret = "SET-OUT-OF-BAND", cookieKey = "SET-OUT-OF-BAND" })

  lifecycle {
    ignore_changes = [value]
  }
}

data "archive_file" "edge_auth" {
  type        = "zip"
  output_path = "${path.module}/build/edge-auth.zip"

  source {
    filename = "index.js"
    content  = file("${path.module}/auth/index.js")
  }

  source {
    filename = "config.json"
    content = jsonencode({
      tenantId        = var.entra_tenant_id
      clientId        = var.entra_client_id
      sessionHours    = var.session_hours
      secretParameter = local.secret_param_name
      ssmRegion       = "us-east-1"
    })
  }
}

data "aws_iam_policy_document" "edge_auth_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com", "edgelambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "edge_auth" {
  name               = "${var.project}-edge-auth"
  assume_role_policy = data.aws_iam_policy_document.edge_auth_trust.json
}

data "aws_iam_policy_document" "edge_auth" {
  # Lambda@Edge writes logs in the region where it ran, as /aws/lambda/us-east-1.<name>.
  statement {
    sid       = "Logs"
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/us-east-1.${local.edge_function_name}:*"]
  }

  # aws/ssm is an AWS-managed key whose policy already allows decrypt via SSM for this account.
  statement {
    sid       = "ReadAuthSecrets"
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.edge_auth.arn]
  }
}

resource "aws_iam_role_policy" "edge_auth" {
  name   = "edge-auth"
  role   = aws_iam_role.edge_auth.id
  policy = data.aws_iam_policy_document.edge_auth.json
}

resource "aws_lambda_function" "edge_auth" {
  provider = aws.us_east_1

  function_name    = local.edge_function_name
  description      = "Entra ID OIDC sign-in for the MGA Sprint Board (viewer-request)"
  role             = aws_iam_role.edge_auth.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.edge_auth.output_path
  source_code_hash = data.archive_file.edge_auth.output_base64sha256
  memory_size      = 128
  timeout          = 5
  publish          = true # CloudFront needs a numbered version

  # Removing the function later: detach it from CloudFront first; edge replicas take hours to clear.
}

# Pre-create log groups with a 30-day retention where most executions will land.
# Replicas in other regions create their own groups on first use (never-expire by default):
# see MIGRATION.md "Logging" for the one-line retention fix.
resource "aws_cloudwatch_log_group" "edge_auth_us_east_1" {
  provider          = aws.us_east_1
  name              = "/aws/lambda/us-east-1.${local.edge_function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "edge_auth_home_region" {
  name              = "/aws/lambda/us-east-1.${local.edge_function_name}"
  retention_in_days = 30
}
