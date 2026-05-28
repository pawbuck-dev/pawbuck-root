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

Build context is the **repository root** (the API references `PawBuck.MedicationAdr` and `packages/milo-journal-trees`):

```bash
# from repo root
docker build -f backend/PawBuck.API/Dockerfile -t pawbuck-api:latest .
```

Push to **ECR** and use the image in an ECS task definition:

- **Container port:** `8080`
- **Health check path (ALB):** `GET /api/health` → `{ "status": "healthy", "mailResolveConfigured": true/false, ... }` (boolean flags only; no secrets). Use `mailResolveConfigured` and `supabaseServiceRoleConfigured` after ECS deploy to confirm Review Inbox (`POST /api/mail/resolve`) can call Supabase Edge Functions.
- **Environment:** `ASPNETCORE_ENVIRONMENT=Production` (or `Staging`)

### ECS task size (Fargate CPU / memory)

Milo vision (classify + extract on multi-page PDFs) loads full document bytes into memory and calls Gemini. **512 MiB / 1024 MiB tasks often OOM or fail to start**, which shows up as ECS tasks cycling **STOPPED** during deploy.

**Recommended minimum for production:** **1024 CPU** (1 vCPU) and **4096 MiB** (4 GB) memory.

Set GitHub **Variables** so each **Deploy AWS** run keeps this size when the merge script registers a new task definition:

| Variable | Example | Notes |
|----------|---------|--------|
| `AWS_ECS_TASK_CPU` | `1024` | Fargate CPU units (1024 = 1 vCPU). Set together with memory. |
| `AWS_ECS_TASK_MEMORY` | `4096` | Memory in **MiB**. Must be a [valid Fargate pair](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html) for your CPU. |

If you raised memory in the ECS console manually, set these variables to the **same values** before the next deploy so the workflow does not register a revision with the old size.

After deploy, confirm tasks stay **Running**: ECS → cluster → service → **Tasks** tab (not repeatedly **Essential container exited** / **OutOfMemoryError** in stopped task logs).

### Required configuration (secrets / env)

Set the same values you use locally (`appsettings`), via task definition env or secrets injection:

- `Supabase__ConnectionString`, `Supabase__Url`, `Supabase__JwtSecret` (or `SUPABASE_JWT_SECRET`)
- `Supabase__ServiceRoleKey` (or `SUPABASE_SERVICE_ROLE_KEY`) — used server-side to invoke Edge Functions such as `mailgun-process-pet-mail` for **Review Inbox** reprocessing (`POST /api/mail/resolve`); must not be exposed to clients
- `Gemini__ApiKey` or `GOOGLE_GEMINI_API_KEY`
- Optional: `Admin__RequiredAppMetadataRole` (default `admin`), `Admin__AllowAnonymousSupportInDevelopment` (must be **false** in Production)
- Scheduling / vendor keys as needed

### Gemini API key (Secrets Manager + ECS, recommended)

Store the Google AI Studio / Gemini key in **AWS Secrets Manager** and inject it at task startup as a **container secret** (not a plain `environment` value). The API reads **`Gemini__ApiKey`** (same as `Gemini:ApiKey` in appsettings) or **`GOOGLE_GEMINI_API_KEY`** — see [backend/PawBuck.API/Program.cs](../backend/PawBuck.API/Program.cs). ECS maps the secret into the process environment for you; **no .NET AWS SDK is required**.

**1. Create the secret**

- **Plain string secret:** the secret value is only the API key (one line). Use the secret’s **full ARN** as `valueFrom` (see step 3).
- **JSON secret:** e.g. `{"ApiKey":"AIza…"}`. ECS `valueFrom` must include the JSON key and trailing colons: append **`:ApiKey::`** to the full secret ARN (see [specifying JSON key](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html)).

**2. IAM on the ECS task execution role**

The role in **`executionRoleArn`** on the task definition must allow ECS to call `GetSecretValue` when starting tasks:

- `secretsmanager:GetSecretValue` on the secret ARN (tighten resource to that ARN or prefix).
- If the secret uses a **customer managed KMS key**, also allow `kms:Decrypt` on that key.

Without this, new tasks fail with **ResourceInitializationError** / cannot pull secrets.

Example statement (replace the secret ARN; add `kms:Decrypt` if you use a CMK):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcsExecutionReadGeminiSecret",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:pawbuck/prod/gemini-*"
    }
  ]
}
```

**3. Task definition `secrets`**

On the API container, add (example names only):

```json
"secrets": [
  {
    "name": "Gemini__ApiKey",
    "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:pawbuck/prod/gemini-AbCdEf"
  }
]
```

For a JSON secret whose field is `ApiKey`, set `valueFrom` to:

`arn:aws:secretsmanager:REGION:ACCOUNT:secret:pawbuck/prod/gemini-AbCdEf:ApiKey::`

**Model id (`Gemini:Model`)**

- Default in the repo is **`gemini-2.5-flash`** ([appsettings.json](../backend/PawBuck.API/appsettings.json), `GeminiOptions.DefaultModelId`).
- ECS **environment variables** override appsettings: **`Gemini__Model`** or **`GEMINI_MODEL`** (when `Gemini:Model` is empty in config) can force a different model.
- Do **not** set unversioned **`gemini-1.5-flash`** or **`gemini-1.5-pro`** for the Generative Language API with typical **AI Studio** keys — they often return **404 NOT_FOUND** for `generateContent` on `v1beta`. Prefer **removing** those env vars so the default applies, or set an id that **ListModels** shows for your key.
- At startup, the API **remaps** a few legacy short names (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-1.5-flash-8b`) to **`gemini-2.5-flash`** and logs a warning — you should still fix the task definition to avoid confusion.

**Journal / Milo (“paid tier” quality on this stack)**

- Milo journal mode uses the same **`Gemini:Model`** as the rest of the API (`generateContent` on **Google AI Studio** / Generative Language API). There is **no separate** journal-only model id in code today.
- For best results and fewer 404s, run **`gemini-2.5-flash`** (repo default) or another id your key supports per **ListModels**. Unversioned **`gemini-1.5-pro`** in ECS is **remapped** to `gemini-2.5-flash` at startup; use a **versioned** model id only if you have confirmed it works for your project and endpoint.
- **Vertex AI** or other Google Cloud endpoints are not configured in this repo’s PawBuck.API client; changing “paid tier” there would be a separate integration.

**4. Deploy script / GitHub Actions**

[scripts/deploy/ecs-merge-pawbuck-api-env.sh](../scripts/deploy/ecs-merge-pawbuck-api-env.sh) can merge this for you on each API deploy when **`SUPABASE_JWT_SECRET`** is set (same condition as today’s JWT merge):

| Input | Type | Purpose |
|-------|------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub **Actions secret** (recommended) | Supabase **service_role** JWT. Written to ECS as **`Supabase__ServiceRoleKey`**. Required for Review Inbox resolve and support attachment preview. |
| `GEMINI_SECRET_ARN` | GitHub **Actions secret** (optional) | Full Secrets Manager ARN for the Gemini key (plaintext secret). When set, the script adds/replaces container secret **`Gemini__ApiKey`** and removes plaintext **`Gemini__ApiKey`** / **`GOOGLE_GEMINI_API_KEY`** from the merged **environment** so the key is not duplicated in the task definition JSON. |
| `GEMINI_SECRET_JSON_KEY` | GitHub **Actions variable** (optional) | e.g. `ApiKey` — appended as `:KEY::` to `GEMINI_SECRET_ARN` for JSON-shaped secrets. Leave empty when the secret stores the raw key only. |

If `GEMINI_SECRET_ARN` is unset, the script leaves existing container `secrets` / Gemini env as-is (manual console setup still works).

**5. Local development (unchanged)**

ECS injection applies only in AWS. On your machine, keep using **`appsettings.Local.json`** (copy from `appsettings.Local.example.json`), **`GOOGLE_GEMINI_API_KEY`**, or **`Gemini__ApiKey`** in the shell / IDE — same as [Program.cs](../backend/PawBuck.API/Program.cs). Do not commit real keys.

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
- **Idle timeout: 120 seconds** (required for Milo document analyze). The default ALB idle timeout is **60s**; Gemini classify + extract on large PDFs can exceed that and return **504 Gateway Time-out** HTML to mobile clients while PawBuck.API is still processing. Set this to match the Gemini HttpClient budget in `Program.cs` (~120s).
  - **Console:** EC2 → Load Balancers → your API ALB → **Attributes** → **Idle timeout** → `120`.
- **Gemini per-attempt timeout:** PawBuck.API sets `AttemptTimeout` and `TotalRequestTimeout` to **120s** on the `"Gemini"` HttpClient (Polly default attempt timeout is only **10s**, which fails extraction on dense vaccination PDFs before ALB times out). Redeploy the API after changing this.
- **Post-deploy verify:** In the consumer app, open Milo chat → **+** → upload a multi-page PDF. Confirm analysis completes without a 504; retry the same file and confirm Health Records does not show duplicate vault rows.

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
   - **ECS**: `UpdateService`, `DescribeServices`, **`DescribeTaskDefinition`**, **`RegisterTaskDefinition`** (required for `scripts/deploy/ecs-merge-pawbuck-api-env.sh`; without them you get `AccessDeniedException` on `DescribeTaskDefinition`). `DescribeServices` and `UpdateService` are also required for the cluster/service you deploy to.
   - **S3**: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on the admin bucket (and prefix if used).
   - **CloudFront**: `cloudfront:CreateInvalidation` on the distribution.

   **Minimal ECS add-on** (attach to the same role GitHub assumes, e.g. `GitHubActions-Pawbuck-Deploy`), if your role only had `UpdateService` and `DescribeServices` before:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "EcsTaskDefinitionDeploy",
         "Effect": "Allow",
         "Action": [
           "ecs:DescribeTaskDefinition",
           "ecs:RegisterTaskDefinition"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

   Tighten `Resource` later to `arn:aws:ecs:REGION:ACCOUNT:task-definition/YOUR_FAMILY:*` if your org requires it.
4. In the GitHub repo → **Settings → Secrets and variables → Actions**:
   - **Secret:** `AWS_ROLE_ARN` = role ARN from step 2.
   - **Secret (recommended):** `SUPABASE_JWT_SECRET` = Supabase **JWT secret** (Dashboard → Project Settings → API). If set, the **Deploy AWS** API job merges it (and related env) into the ECS task definition. If omitted, the workflow only **forces a new deployment** (you can keep JWT set manually on the task definition).
   - **Secret (recommended):** `SUPABASE_SERVICE_ROLE_KEY` = Supabase **service_role** JWT (Dashboard → Project Settings → API). Merged as **`Supabase__ServiceRoleKey`** on each deploy. Required for **Review Inbox** reprocessing (`POST /api/mail/resolve`), support attachment preview, and server-side Storage access. **Never** expose this to mobile clients or commit it.
   - **Secret (optional):** `GEMINI_SECRET_ARN` = full ARN of the Secrets Manager secret for the Gemini API key. When set (with `SUPABASE_JWT_SECRET` so the merge script runs), the deploy injects **`Gemini__ApiKey`** as an ECS container secret. See **Gemini API key (Secrets Manager + ECS)** above.

### Repository Variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Used by | Example |
|----------|---------|---------|
| `AWS_REGION` | Deploy | `us-east-1` (optional; defaults in workflow) |
| `AWS_ECR_REPOSITORY` | API deploy | `pawbuck-api` |
| `AWS_ECS_CLUSTER` | API deploy | `my-cluster` |
| `AWS_ECS_SERVICE` | API deploy | `pawbuck-api` |
| `AWS_ECS_CONTAINER_NAME` | API deploy | Optional. Container name to set env on; defaults to the **first** container in the task definition. |
| `AWS_ECS_TASK_CPU` | API deploy | Optional. Fargate CPU units (e.g. `1024`). Set with `AWS_ECS_TASK_MEMORY` — see **ECS task size** above. |
| `AWS_ECS_TASK_MEMORY` | API deploy | Optional. Fargate memory in MiB (e.g. `4096` for Milo PDF workloads). |
| `GEMINI_SECRET_JSON_KEY` | API deploy | Optional. When `GEMINI_SECRET_ARN` secret is set and the secret is JSON, set to the field name (e.g. `ApiKey`). Leave empty for a plaintext secret value. |
| `AWS_S3_ADMIN_BUCKET` | Admin deploy | `my-admin-static` |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | Admin deploy | `E123...` (optional; skip invalidation if empty) |
| `VITE_ADMIN_API_BASE` | Admin build | **`Required`** for deploy: `https://api.example.com` (no trailing slash). If empty, the SPA requests `/api/...` on CloudFront and S3 returns **403**. |
| `VITE_SUPABASE_URL` | Admin build | Same as consumer app: `https://YOUR_REF.supabase.co`. Needed for admin **sign-in** and support API calls. |
| `VITE_SUPABASE_ANON_KEY` | Admin build | Supabase **anon** key (public; same as `EXPO_PUBLIC_SUPABASE_KEY`). |

### Admin access (Supabase JWT, not an API key)

1. In **Supabase Dashboard → Authentication → Users**, create or pick a user for operators, then set **User Metadata / App Metadata** so **`app_metadata.role`** equals the API’s `Admin:RequiredAppMetadataRole` (default **`admin`**). You can use the SQL editor or Auth Admin API; `role` must appear on the **access token** JWT.
2. **ECS** must set `ASPNETCORE_ENVIRONMENT=Production` (or Staging) and **`Admin__AllowAnonymousSupportInDevelopment=false`** (default in `appsettings.json`). The API validates Supabase JWTs using **`Supabase__JwtSecret`** (or `SUPABASE_JWT_SECRET`).
3. Operators open the hosted **admin-dashboard**, sign in with email/password (or your enabled providers), and the SPA sends **`Authorization: Bearer`** (Supabase access token) to `/api/support/*`.

Verify **`GET /api/health`** on your public API host after deploy (e.g. `curl`); support routes need a real admin JWT (manual sign-in to the admin app is enough).

### Run a deploy

1. **Actions** → **Deploy AWS** → **Run workflow**.
2. Choose **deploy_target**: `api`, `admin`, or `both`.
3. Ensure ECS task definition uses the same ECR image repository and tag strategy (`latest` is pushed by the workflow).

### Testing the deployment pipeline

1. **Confirm GitHub configuration**
   - **Secret:** `AWS_ROLE_ARN` (OIDC role ARN).
   - **Variables:** `AWS_ECR_REPOSITORY`, `AWS_ECS_CLUSTER`, `AWS_ECS_SERVICE` (and for admin: `AWS_S3_ADMIN_BUCKET`, `VITE_ADMIN_API_BASE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `AWS_CLOUDFRONT_DISTRIBUTION_ID`).
   - **Region:** Set `AWS_REGION` if not `us-east-1`.

2. **Run the workflow**
   - **Actions** → **Deploy AWS** → **Run workflow** → choose **`api`** first (smallest surface area).

3. **Verify API job (green checkmarks)**
   - **Configure AWS credentials** succeeds (if OIDC fails, check IAM trust policy: `repo:OWNER/REPO:ref:refs/heads/main` or `workflow_dispatch`, and `id-token: write` in the workflow).
   - **Login to Amazon ECR** succeeds.
   - **Build, tag, push image** shows push to `.../REPO:sha` and `:latest`.
   - **ECS force new deployment** completes without AWS API errors.
   - **Wait for ECS service stability** step succeeds (new tasks pass health checks; fails the workflow if tasks keep stopping).

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

## Local health check (Docker image)

```bash
docker build -f backend/PawBuck.API/Dockerfile -t pawbuck-api:local .
docker run --rm -p 8080:8080 \
  -e ASPNETCORE_ENVIRONMENT=Development \
  -e Cors__AllowedOrigins__0=http://localhost:5173 \
  pawbuck-api:local
curl -s http://localhost:8080/api/health
```

(Use real secrets only in a secure environment; never commit `appsettings.Local.json`.)
