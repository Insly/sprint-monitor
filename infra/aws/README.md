# infra/aws: MGA Sprint Board on AWS (OpenTofu)

**Status: skeleton, never applied, not validated with `tofu validate`.** No OpenTofu or Terraform
binary was installed when this was written. Run the checks in "First run" before anything else.
Why this design: [docs/aws/MIGRATION.md](../../docs/aws/MIGRATION.md).

## What it creates

| File | Resources |
|---|---|
| `storage.tf` | Private, versioned S3 site bucket (SSE-S3, TLS-only, old versions kept 90 days); access-log bucket (90-day expiry) |
| `cdn.tf` | CloudFront distribution with Origin Access Control, cache policy that honours `no-cache`, response headers policy (CSP, HSTS, nosniff, Referrer-Policy, frame-ancestors/X-Frame-Options DENY) |
| `auth.tf` + `auth/index.js` | Lambda@Edge (us-east-1, viewer-request) doing Entra ID sign-in; SSM SecureString for its secrets; log groups with 30-day retention |
| `dns.tf` | ACM certificate in us-east-1; Route53 records only if `route53_zone_id` is set, otherwise outputs for IT |
| `github-deploy.tf` | GitHub OIDC provider + deploy role: `s3:ListBucket`, `s3:PutObject`, `s3:DeleteObject` on this bucket, `cloudfront:CreateInvalidation`/`GetInvalidation` on this distribution |
| `budget.tf` | Monthly AWS Budget, mail at 50 % actual and 100 % forecast |
| `outputs.tf` | Values for the GitHub repository variables, Entra redirect URIs, DNS records for IT |

Regions: buckets in `var.region` (eu-north-1 default, eu-central-1 allowed). ACM certificate and
Lambda@Edge must be in us-east-1. That is a CloudFront rule, not a choice. No site content is stored there.

## Prerequisites

- OpenTofu >= 1.10 (`winget install OpenTofu.Tofu` or https://opentofu.org/docs/intro/install/).
- AWS CLI v2 and an SSO profile for the target account with admin rights for the first apply
  (`aws configure sso`, then `export AWS_PROFILE=sprint-monitor`). No access keys.
- From IT: tenant ID, the app registration's client ID and a client secret (MIGRATION.md §8.1).

## First run (dry run, nothing on the friendly hostname yet)

```sh
cd infra/aws
cp terraform.tfvars.example terraform.tfvars   # fill in tenant/client IDs, e-mails
tofu init
tofu fmt -check && tofu validate               # never run so far: fix anything this finds first
tofu plan -out=tfplan                          # read it: about 25 resources, all new
tofu apply tfplan
```

Then set the edge-auth secret once. It stays out of tofu state and git:

```sh
COOKIE_KEY=$(openssl rand -base64 48)
aws ssm put-parameter --region us-east-1 --overwrite --type SecureString \
  --name "$(tofu output -raw auth_secret_parameter)" \
  --value "{\"clientSecret\":\"<from IT>\",\"cookieKey\":\"$COOKIE_KEY\"}"
```

Until this is done every request gets a 503 (fails closed). The function caches the secret for 5 minutes.

Give `tofu output entra_redirect_uris` to IT, put the four GitHub variables from the outputs into
the repository (Settings > Secrets and variables > Actions > Variables), create the GitHub
environment `aws-production` limited to the `main` branch, and run the **deploy-aws** workflow.

## Friendly hostname

- **Route53 hosts the zone:** set `domain_name`, `route53_zone_id`, `attach_custom_domain = true`, apply once.
- **External DNS (likely for insly.com):**
  1. Set `domain_name`, keep `attach_custom_domain = false`, apply.
  2. IT creates the CNAMEs from `tofu output acm_validation_records`.
  3. Wait for `aws acm describe-certificate --region us-east-1 --certificate-arn ... --query Certificate.Status` = `ISSUED`.
  4. Set `attach_custom_domain = true`, apply. Then IT creates the record in `tofu output dns_record_for_it`.

## State backend

- **First apply: local state** (`terraform.tfstate` here, gitignored). Fine for one owner, one machine,
  and the state holds no secrets: the client secret and cookie key are set out of band in SSM.
- **Right after:** move state to S3 so it is not tied to one laptop:
  ```sh
  aws s3api create-bucket --bucket insly-sprint-monitor-tfstate --region eu-north-1 \
    --create-bucket-configuration LocationConstraint=eu-north-1
  aws s3api put-bucket-versioning --bucket insly-sprint-monitor-tfstate --versioning-configuration Status=Enabled
  aws s3api put-public-access-block --bucket insly-sprint-monitor-tfstate \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  # uncomment the backend "s3" block in versions.tf, then:
  tofu init -migrate-state
  ```
  Locking uses the S3-native lock file (`use_lockfile = true`). On OpenTofu >= 1.10 a DynamoDB table
  is no longer needed. If IT already runs a shared state bucket, use that bucket and a unique `key` instead.

## Day-2 operations

| Task | Command |
|---|---|
| Deploy | GitHub > Actions > deploy-aws > Run workflow (branch `main`, `sha` empty) |
| Roll back | Same workflow with `sha` = last good commit on main, or `gh workflow run deploy-aws.yml -f sha=<sha>` |
| Break-glass rollback (Actions down) | `git checkout <sha> && aws s3 sync public/ s3://<bucket> --delete --cache-control no-cache && aws cloudfront create-invalidation --distribution-id <id> --paths "/*"` with your SSO profile |
| Rotate Entra client secret (expires, max 24 months) | New secret in Entra, `aws ssm put-parameter ... --overwrite` (keep the cookieKey), delete the old secret in Entra after 5 minutes |
| Sign everyone out | Put a new `cookieKey` in the SSM parameter |
| Check sign-in is up | `curl -s https://<host>/_auth/health` returns `ok` |
| Change session length | `session_hours` in tfvars, apply (publishes a new Lambda version; edge rollout takes a few minutes) |
| Tear down | Detach/delete the distribution first; Lambda@Edge replicas take hours to clear before the function can be deleted. Empty the versioned buckets (all versions) before `tofu destroy`. |

## Known gaps (fix during review)

- `tofu validate` has never run. Expect small fixes.
- `auth/index.js` was smoke-tested locally with a stubbed SSM client and token endpoint (login redirect,
  PKCE, callback, wrong tenant, tampered cookie, state mismatch, cookies blocked, open-redirect guard,
  fail-closed on errors). It has not run on Lambda@Edge or against Entra yet. It has no unit tests in
  the repo, because the repo's `vitest` run would pick them up and the AWS SDK is not a dependency.
  Add them in this folder with their own runner if the code grows.
- Lambda@Edge log groups in regions other than us-east-1 and `var.region` are created on first use with
  no expiry: see MIGRATION.md §5.4.
