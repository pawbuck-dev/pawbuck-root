# AWS hosting — PawBuck.API (ECS Fargate + ALB) + admin-dashboard (S3 + CloudFront)

This matches the **recommended** layout: run the .NET API in containers behind an ALB; serve the Vite admin SPA as static files from S3 with CloudFront.

## Architecture

| Component | AWS service | Notes |
|-----------|-------------|--------|
| **PawBuck.API** | **ECR** (image) → **ECS Fargate** → **Application Load Balancer** | HTTPS on ALB; tasks listen on **8080** (see `Dockerfile`). |
| **admin-dashboard** | **S3** (bucket) + **CloudFront** | `pnpm --filter pawbuck-admin-dashboard build`; upload `admin-dashboard/dist/`. |
| **Secrets** | **Secrets Manager** or **SSM Parameter Store** | DB string, JWT secret, Gemini, vendor keys. |
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
- Optional: `Admin__RequiredAppMetadataRole` (default `admin`), `Admin__AllowAnonymousSupportInDevelopment` (must be **false** in Production)
- Scheduling / vendor keys as needed

**Support routes** (`/api/support/*`) require a **Supabase access token** whose JWT includes `app_metadata.role` matching `Admin:RequiredAppMetadataRole` (see below). No shared API key.

### CORS (admin browser → API)

The API reads **`Cors:AllowedOrigins`**. If the array is **non-empty**, **only** those origins are allowed (replace dev defaults).

In ECS, set for example:

- `Cors__AllowedOrigins__0` = `https://dxxxxxxxxxxxx.cloudfront.net` **or** your admin hostname `https://admin.example.com`

If you leave `Cors:AllowedOrigins` empty, the **localhost / Expo dev** defaults apply — **not** suitable for a public production API that only the hosted admin should call from the browser.

## Admin dashboard (S3 + CloudFront)

1. **Build** with the **production API base URL** and **Supabase** (same project as the mobile app) baked in:

   ```bash
   export VITE_ADMIN_API_BASE=https://api.example.com
   export VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
   export VITE_SUPABASE_ANON_KEY=your_anon_key
   pnpm --filter pawbuck-admin-dashboard build
   ```

   (`VITE_ADMIN_API_BASE` is the PawBuck.API origin; `VITE_SUPABASE_*` powers sign-in so the SPA can send `Authorization: Bearer` to support routes. See `src/App.tsx` and `src/supabaseClient.ts`.)

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
   - **ECS**: `UpdateService`, `DescribeServices`, `DescribeTaskDefinition`, `RegisterTaskDefinition` on your cluster/task-definition family (see `deploy-aws.yml` — API deploy registers a new task definition revision with merged env vars).
   - **S3**: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on the admin bucket (and prefix if used).
   - **CloudFront**: `cloudfront:CreateInvalidation` on the distribution.
4. In the GitHub repo → **Settings → Secrets and variables → Actions**:
   - **Secret:** `AWS_ROLE_ARN` = role ARN from step 2.
   - **Secret:** `SUPABASE_JWT_SECRET` = Supabase **JWT secret** (Dashboard → Project Settings → API). Used by the **Deploy AWS** workflow when deploying the API to merge `SUPABASE_JWT_SECRET` (and related env) into the ECS task definition.

### Repository Variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Used by | Example |
|----------|---------|---------|
| `AWS_REGION` | Deploy | `us-east-1` (optional; defaults in workflow) |
| `AWS_ECR_REPOSITORY` | API deploy | `pawbuck-api` |
| `AWS_ECS_CLUSTER` | API deploy | `my-cluster` |
| `AWS_ECS_SERVICE` | API deploy | `pawbuck-api` |
| `AWS_ECS_CONTAINER_NAME` | API deploy | Optional. Container name to set env on; defaults to the **first** container in the task definition. |
| `AWS_S3_ADMIN_BUCKET` | Admin deploy | `my-admin-static` |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | Admin deploy | `E123...` (optional; skip invalidation if empty) |
| `VITE_ADMIN_API_BASE` | Admin build | **`Required`** for deploy: `https://api.example.com` (no trailing slash). If empty, the SPA requests `/api/...` on CloudFront and S3 returns **403**. |
| `VITE_SUPABASE_URL` | Admin build | Same as consumer app: `https://YOUR_REF.supabase.co`. Needed for admin **sign-in** and support API calls. |
| `VITE_SUPABASE_ANON_KEY` | Admin build | Supabase **anon** key (public; same as `EXPO_PUBLIC_SUPABASE_KEY`). |
| `API_PUBLIC_BASE_URL` | API smoke test (optional) | Same public API origin as `VITE_ADMIN_API_BASE` (no trailing slash). If unset, the workflow falls back to `VITE_ADMIN_API_BASE` for the post-deploy `GET /api/health` check. |

### Admin access (Supabase JWT, not an API key)

1. In **Supabase Dashboard → Authentication → Users**, create or pick a user for operators, then set **User Metadata / App Metadata** so **`app_metadata.role`** equals the API’s `Admin:RequiredAppMetadataRole` (default **`admin`**). You can use the SQL editor or Auth Admin API; `role` must appear on the **access token** JWT.
2. **ECS** must set `ASPNETCORE_ENVIRONMENT=Production` (or Staging) and **`Admin__AllowAnonymousSupportInDevelopment=false`** (default in `appsettings.json`). The API validates Supabase JWTs using **`Supabase__JwtSecret`** (or `SUPABASE_JWT_SECRET`).
3. Operators open the hosted **admin-dashboard**, sign in with email/password (or your enabled providers), and the SPA sends **`Authorization: Bearer`** (Supabase access token) to `/api/support/*`.

The **optional** GitHub **Smoke test deployed API** step only checks **`GET /api/health`** (no JWT). Verifying support routes is a manual sign-in test or a separate integration test with a real token.

### Run a deploy

1. **Actions** → **Deploy AWS** → **Run workflow**.
2. Choose **deploy_target**: `api`, `admin`, or `both`.
3. Ensure ECS task definition uses the same ECR image repository and tag strategy (`latest` is pushed by the workflow).

### Testing the deployment pipeline

1. **Confirm GitHub configuration**
   - **Secret:** `AWS_ROLE_ARN` (OIDC role ARN).
   - **Variables:** `AWS_ECR_REPOSITORY`, `AWS_ECS_CLUSTER`, `AWS_ECS_SERVICE` (and for admin: `AWS_S3_ADMIN_BUCKET`, `VITE_ADMIN_API_BASE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `AWS_CLOUDFRONT_DISTRIBUTION_ID`, optional `API_PUBLIC_BASE_URL` for API-only smoke tests).
   - **Region:** Set `AWS_REGION` if not `us-east-1`.

2. **Run the workflow**
   - **Actions** → **Deploy AWS** → **Run workflow** → choose **`api`** first (smallest surface area).

3. **Verify API job (green checkmarks)**
   - **Configure AWS credentials** succeeds (if OIDC fails, check IAM trust policy: `repo:OWNER/REPO:ref:refs/heads/main` or `workflow_dispatch`, and `id-token: write` in the workflow).
   - **Login to Amazon ECR** succeeds.
   - **Build, tag, push image** shows push to `.../REPO:sha` and `:latest`.
   - **ECS force new deployment** completes without AWS API errors.
   - **Smoke test deployed API (optional)** runs if `API_PUBLIC_BASE_URL` or `VITE_ADMIN_API_BASE` is set; otherwise it prints a skip message (not a failure).

4. **Verify in AWS**
   - **ECR:** New image tags (`latest` and commit SHA) on the repository.
   - **ECS:** Service **Deployments** tab shows a new deployment in **In progress** then **Completed**; tasks cycle to **Running**.
   - **ALB (if configured):** Target group **healthy** targets; `GET https://your-api-host/api/health` returns `{"status":"healthy"}`.

5. **Test admin deploy (`deploy_target`: `admin` or `both`)**
   - Confirm `VITE_ADMIN_API_BASE` is your **public** API URL (the one the browser will call).
   - After success, open the **CloudFront** URL (or S3 website if used) and confirm the admin UI loads; check browser **Network** tab for API calls to the correct host and **CORS** (API `Cors:AllowedOrigins` must include the admin origin).

6. **If something fails**
   - Open the failed **job** → expand the failed **step**; common issues: wrong role ARN, ECR repo name mismatch, ECS cluster/service names, missing IAM permission (`ecr:*`, `ecs:UpdateService`, `s3:*`, `cloudfront:CreateInvalidation`), or admin build missing `VITE_ADMIN_API_BASE`.

### OIDC error: “Could not load credentials from any providers”

This comes from `aws-actions/configure-aws-credentials` when **no usable credentials** were produced. Check in order:

1. **Secret `AWS_ROLE_ARN`**
   - Repo → **Settings → Secrets and variables → Actions → Secrets**.
   - Name must be exactly **`AWS_ROLE_ARN`** (not a Variable).
   - Value must be the **full ARN**: `arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME` (no quotes or spaces).

2. **Workflow permission for OIDC**
   - The workflow must include `permissions: id-token: write` (already set in `deploy-aws.yml`). Without it, GitHub cannot mint the OIDC token.

3. **IAM OIDC identity provider (AWS)**
   - **IAM → Identity providers** must include **token.actions.githubusercontent.com** (provider URL) with **audience** `sts.amazonaws.com` (default for GitHub → AWS).
   - If missing, add the GitHub OIDC provider using AWS docs / “Configure AWS credentials” guide.

4. **IAM role trust policy**
   - The role in `AWS_ROLE_ARN` must **trust** GitHub’s OIDC. Example condition (replace `OWNER`, `REPO`, and account id):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:*"
        }
      }
    }
  ]
}
```

   - **`sub` must match** how GitHub identifies the workflow. If you restricted to one branch, use e.g. `repo:OWNER/REPO:ref:refs/heads/main`. For manual runs (**workflow_dispatch**), the subject still includes the branch you selected (e.g. `refs/heads/main`). A broad pattern `repo:OWNER/REPO:*` is easiest while testing; tighten later.

5. **Wrong AWS account**
   - The role ARN must live in the **same account** as ECR/ECS/S3 you are deploying to.

If OIDC is blocked, you can temporarily use **long-lived keys** (less secure): add secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, then replace the **Configure AWS credentials** step with the [static key inputs](https://github.com/aws-actions/configure-aws-credentials#readme) (`aws-access-key-id` / `aws-secret-access-key`) and **omit** `role-to-assume`.

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
