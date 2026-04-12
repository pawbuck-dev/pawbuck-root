# AWS hosting — PawBuck.API (ECS Fargate + ALB) + admin-dashboard (S3 + CloudFront)

This matches the **recommended** layout: run the .NET API in containers behind an ALB; serve the Vite admin SPA as static files from S3 with CloudFront.

## Architecture

| Component | AWS service | Notes |
|-----------|-------------|--------|
| **PawBuck.API** | **ECR** (image) → **ECS Fargate** → **Application Load Balancer** | HTTPS on ALB; tasks listen on **8080** (see `Dockerfile`). |
| **admin-dashboard** | **S3** (bucket) + **CloudFront** | `pnpm --filter pawbuck-admin-dashboard build`; upload `admin-dashboard/dist/`. |
| **Secrets** | **Secrets Manager** or **SSM Parameter Store** | DB string, JWT secret, Gemini, `Admin:ApiKey`, vendor keys. |
| **Region** | Prefer **us-east-1** (or same region as your Supabase project) | Low latency to Supabase Postgres. |

## API container

Build context is **`backend/PawBuck.API/`** (where `Dockerfile` lives):

```bash
cd backend/PawBuck.API
docker build -t pawbuck-api:latest .
```

Push to **ECR** and use the image in an ECS task definition:

- **Container port:** `8080`
- **Health check path (ALB):** `GET /api/health` → `{ "status": "healthy" }`
- **Environment:** `ASPNETCORE_ENVIRONMENT=Production` (or `Staging`)

### Required configuration (secrets / env)

Set the same values you use locally (`appsettings`), via task definition env or secrets injection:

- `Supabase__ConnectionString`, `Supabase__Url`, `Supabase__JwtSecret` (or `SUPABASE_JWT_SECRET`)
- `Gemini__ApiKey` or `GOOGLE_GEMINI_API_KEY`
- `Admin__ApiKey` (must match what admins store in the dashboard)
- Scheduling / vendor keys as needed

### CORS (admin browser → API)

The API reads **`Cors:AllowedOrigins`**. If the array is **non-empty**, **only** those origins are allowed (replace dev defaults).

In ECS, set for example:

- `Cors__AllowedOrigins__0` = `https://dxxxxxxxxxxxx.cloudfront.net` **or** your admin hostname `https://admin.example.com`

If you leave `Cors:AllowedOrigins` empty, the **localhost / Expo dev** defaults apply — **not** suitable for a public production API that only the hosted admin should call from the browser.

## Admin dashboard (S3 + CloudFront)

1. **Build** with the **production API base URL** baked in:

   ```bash
   export VITE_ADMIN_API_BASE=https://api.example.com
   pnpm --filter pawbuck-admin-dashboard build
   ```

   (`admin-dashboard` uses `import.meta.env.VITE_ADMIN_API_BASE`; see `src/App.tsx`.)

2. **Upload** `admin-dashboard/dist/` to an S3 bucket (private; origin access controlled by CloudFront OAC).

3. **CloudFront** distribution with default behavior → S3 origin. For SPA routing, map **403/404** to `/index.html` if you use client-side routes later.

4. **HTTPS** via ACM certificate (must be in **us-east-1** for CloudFront).

5. Add the CloudFront URL (or custom domain) to **`Cors:AllowedOrigins`** on the API as above.

## ALB checklist

- Target group: **HTTP** to task IP:8080 (or HTTPS if you terminate TLS on NLB — usually ALB terminates TLS and talks HTTP to tasks).
- Health check: path **`/api/health`**, matcher **200**.
- Idle timeout: default often fine; long uploads may need tuning.

## CI/CD (GitHub Actions)

Workflows live under [`.github/workflows/`](../.github/workflows/).

| Workflow | When | What |
|----------|------|------|
| **`pawbuck-api-ci.yml`** | Push/PR when `backend/PawBuck.API/**` or tests change | `dotnet test` on **PawBuck.API.Tests** |
| **`deploy-aws.yml`** | **Actions → Run workflow** (manual) | Deploy **api** (ECR + ECS), **admin** (S3 + optional CloudFront), or **both** |

### One-time AWS setup for GitHub OIDC (recommended)

1. In **IAM**, create an **OIDC identity provider** for `token.actions.githubusercontent.com` (if not already present for your org).
2. Create an **IAM role** trusted by GitHub (e.g. `repo:YOUR_ORG/pawbuck-root:ref:refs/heads/main` or a tighter pattern).
3. Attach policies allowing:
   - **ECR**: `GetAuthorizationToken`, `BatchCheckLayerAvailability`, `PutImage`, `InitiateLayerUpload`, `UploadLayerPart`, `CompleteLayerUpload`, `BatchGetImage` on your repository ARN.
   - **ECS**: `UpdateService`, `DescribeServices` on your cluster/service.
   - **S3**: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on the admin bucket (and prefix if used).
   - **CloudFront**: `cloudfront:CreateInvalidation` on the distribution.
4. In the GitHub repo → **Settings → Secrets and variables → Actions**:
   - **Secret:** `AWS_ROLE_TO_ASSUME` = role ARN from step 2.

### Repository Variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Used by | Example |
|----------|---------|---------|
| `AWS_REGION` | Deploy | `us-east-1` (optional; defaults in workflow) |
| `AWS_ECR_REPOSITORY` | API deploy | `pawbuck-api` |
| `AWS_ECS_CLUSTER` | API deploy | `my-cluster` |
| `AWS_ECS_SERVICE` | API deploy | `pawbuck-api` |
| `AWS_S3_ADMIN_BUCKET` | Admin deploy | `my-admin-static` |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | Admin deploy | `E123...` (optional; skip invalidation if empty) |
| `VITE_ADMIN_API_BASE` | Admin build | `https://api.example.com` (no trailing slash) |

### Run a deploy

1. **Actions** → **Deploy AWS** → **Run workflow**.
2. Choose **deploy_target**: `api`, `admin`, or `both`.
3. Ensure ECS task definition uses the same ECR image repository and tag strategy (`latest` is pushed by the workflow).

### Without OIDC (not recommended)

Use long-lived keys only if you must: store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as secrets and replace the **Configure AWS credentials** step with the [configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials) inputs for static keys (documented in AWS’s README).

### CI/CD outline (manual vs automated)

- **CI:** Runs on every relevant PR (`pawbuck-api-ci.yml`).
- **CD:** Starts manually until you add `push` triggers or **GitHub Environments** with approvals; extend `deploy-aws.yml` when you are ready.

## Local smoke test of the image

```bash
cd backend/PawBuck.API
docker build -t pawbuck-api:local .
docker run --rm -p 8080:8080 \
  -e ASPNETCORE_ENVIRONMENT=Development \
  -e Cors__AllowedOrigins__0=http://localhost:5173 \
  pawbuck-api:local
curl -s http://localhost:8080/api/health
```

(Use real secrets only in a secure environment; never commit `appsettings.Local.json`.)
