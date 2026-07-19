#!/usr/bin/env bash
# Merge standard PawBuck.API env into the current ECS task definition, register, and update the service.
# Requires: aws, jq. Env: AWS_ECS_CLUSTER, AWS_ECS_SERVICE, AWS_REGION, SUPABASE_JWT_SECRET (GitHub secret value; written to ECS as Supabase__JwtSecret).
# Optional: AWS_ECS_CONTAINER_NAME (defaults to first container in the task definition).
# Optional: SUPABASE_PROJECT_URL — maps to Supabase__Url (same as project URL, e.g. https://REF.supabase.co). Often set from GitHub Variable VITE_SUPABASE_URL in deploy-aws.yml.
# Optional: SUPABASE_SERVICE_ROLE_KEY — maps to Supabase__ServiceRoleKey (server-only; invokes Edge Functions e.g. mailgun-process-pet-mail for Review Inbox). GitHub Actions secret.
# Optional: MILO_INTERNAL_SERVICE_KEY — maps to Milo__InternalServiceKey (must match Supabase Edge secret of the same name for analyze-internal / email vault pipeline). GitHub Actions secret.
# Optional: ADMIN_CORS_ORIGIN — e.g. https://d123.cloudfront.net — sets Cors__AllowedOrigins__0 so the hosted admin SPA can call the API (browser CORS).
# Optional: GEMINI_SECRET_ARN — full Secrets Manager secret ARN for the Gemini API key. When set, adds container secret Gemini__ApiKey (valueFrom) and removes plaintext Gemini env vars from the merged environment. See docs/AWS.md (Gemini + ECS).
# Optional: GEMINI_SECRET_JSON_KEY — when set with GEMINI_SECRET_ARN, appends :KEY:: to valueFrom for JSON-shaped secrets (e.g. ApiKey). Leave empty when the secret stores the raw key string only.
# Optional: AWS_ECS_TASK_CPU — Fargate CPU units (e.g. 1024 = 1 vCPU). Set together with AWS_ECS_TASK_MEMORY so deploys keep your task size (Milo vision PDFs need ≥2 GB).
# Optional: AWS_ECS_TASK_MEMORY — Fargate memory in MiB (e.g. 4096 = 4 GB). Applied on each register-task-definition merge.
# Optional: AWS_ECS_CPU_ARCHITECTURE — X86_64 or ARM64 (Graviton, ~20% cheaper). Must match the pushed image platform (deploy-aws.yml builds linux/arm64 by default). Empty keeps the current task definition's runtimePlatform.
set -euo pipefail

CLUSTER="${AWS_ECS_CLUSTER:?Set AWS_ECS_CLUSTER}"
SERVICE="${AWS_ECS_SERVICE:?Set AWS_ECS_SERVICE}"
REGION="${AWS_REGION:?Set AWS_REGION}"
JWT_SECRET="${SUPABASE_JWT_SECRET:?Set SUPABASE_JWT_SECRET}"
CONTAINER_NAME="${AWS_ECS_CONTAINER_NAME:-}"
# Trim and strip trailing slash for Supabase project URL
SUPABASE_PROJECT_URL="${SUPABASE_PROJECT_URL:-}"
SUPABASE_PROJECT_URL="$(echo -n "$SUPABASE_PROJECT_URL" | tr -d '\r' | sed 's/[[:space:]]*$//' | sed 's#/*$##')"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
SUPABASE_SERVICE_ROLE_KEY="$(echo -n "$SUPABASE_SERVICE_ROLE_KEY" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
MILO_INTERNAL_SERVICE_KEY="${MILO_INTERNAL_SERVICE_KEY:-}"
MILO_INTERNAL_SERVICE_KEY="$(echo -n "$MILO_INTERNAL_SERVICE_KEY" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
ADMIN_CORS_ORIGIN="${ADMIN_CORS_ORIGIN:-}"
ADMIN_CORS_ORIGIN="$(echo -n "$ADMIN_CORS_ORIGIN" | tr -d '\r' | sed 's/[[:space:]]*$//' | sed 's#/*$##')"

GEMINI_SECRET_ARN="${GEMINI_SECRET_ARN:-}"
GEMINI_SECRET_ARN="$(echo -n "$GEMINI_SECRET_ARN" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
GEMINI_SECRET_JSON_KEY="${GEMINI_SECRET_JSON_KEY:-}"
GEMINI_SECRET_JSON_KEY="$(echo -n "$GEMINI_SECRET_JSON_KEY" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
GEMINI_VALUE_FROM="$GEMINI_SECRET_ARN"
if [ -n "$GEMINI_VALUE_FROM" ] && [ -n "$GEMINI_SECRET_JSON_KEY" ]; then
  GEMINI_VALUE_FROM="${GEMINI_VALUE_FROM}:${GEMINI_SECRET_JSON_KEY}::"
fi

TASK_CPU="${AWS_ECS_TASK_CPU:-}"
TASK_CPU="$(echo -n "$TASK_CPU" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
TASK_MEMORY="${AWS_ECS_TASK_MEMORY:-}"
TASK_MEMORY="$(echo -n "$TASK_MEMORY" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

CPU_ARCH="${AWS_ECS_CPU_ARCHITECTURE:-}"
CPU_ARCH="$(echo -n "$CPU_ARCH" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr '[:lower:]' '[:upper:]')"
if [ -n "$CPU_ARCH" ] && [ "$CPU_ARCH" != "X86_64" ] && [ "$CPU_ARCH" != "ARM64" ]; then
  echo "AWS_ECS_CPU_ARCHITECTURE must be X86_64 or ARM64 (got: $CPU_ARCH)" >&2
  exit 1
fi

TD_ARN="$(aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" --region "$REGION" --query 'services[0].taskDefinition' --output text)"
aws ecs describe-task-definition --task-definition "$TD_ARN" --region "$REGION" --query 'taskDefinition' > /tmp/td-full.json

if [ -z "$CONTAINER_NAME" ]; then
  CONTAINER_NAME="$(jq -r '.containerDefinitions[0].name' /tmp/td-full.json)"
fi

EFFECTIVE_MEMORY_MIB="$TASK_MEMORY"
if [ -z "$EFFECTIVE_MEMORY_MIB" ]; then
  EFFECTIVE_MEMORY_MIB="$(jq -r '.memory // empty' /tmp/td-full.json)"
fi
GC_HEAP_LIMIT=""
if [ -n "$EFFECTIVE_MEMORY_MIB" ] && [ "$EFFECTIVE_MEMORY_MIB" -gt 0 ] 2>/dev/null; then
  # Cap managed heap ~75% of task memory so OOM throws in .NET logs instead of opaque exit 139/137.
  GC_HEAP_LIMIT=$(( EFFECTIVE_MEMORY_MIB * 1024 * 1024 * 75 / 100 ))
fi

jq --arg jwt "$JWT_SECRET" --arg cname "$CONTAINER_NAME" --arg supUrl "$SUPABASE_PROJECT_URL" --arg serviceRole "$SUPABASE_SERVICE_ROLE_KEY" --arg miloKey "$MILO_INTERNAL_SERVICE_KEY" --arg corsOrigin "$ADMIN_CORS_ORIGIN" --arg gem "$GEMINI_VALUE_FROM" --arg taskCpu "$TASK_CPU" --arg taskMem "$TASK_MEMORY" --arg gcHeap "$GC_HEAP_LIMIT" --arg cpuArch "$CPU_ARCH" '
  del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy, .deregisteredAt)
  | (if ($taskCpu | length) > 0 then .cpu = $taskCpu else . end)
  | (if ($taskMem | length) > 0 then .memory = $taskMem else . end)
  | (if ($cpuArch | length) > 0 then .runtimePlatform = {"cpuArchitecture": $cpuArch, "operatingSystemFamily": "LINUX"} else . end)
  | .containerDefinitions |= map(
      if .name == $cname then
        .environment = (
          ((.environment // []) | map(select(
            .name != "ASPNETCORE_ENVIRONMENT" and
            .name != "Admin__AllowAnonymousSupportInDevelopment" and
            .name != "SUPABASE_JWT_SECRET" and
            .name != "Supabase__JwtSecret" and
            .name != "ASPNETCORE_URLS" and
            .name != "Supabase__Url" and
            .name != "SUPABASE_URL" and
            .name != "SUPABASE_SERVICE_ROLE_KEY" and
            .name != "Supabase__ServiceRoleKey" and
            .name != "Milo__InternalServiceKey" and
            .name != "DOTNET_RUNNING_IN_CONTAINER" and
            .name != "DOTNET_GCHeapHardLimit" and
            (.name | test("^Cors__AllowedOrigins__") | not) and
            (($gem | length) == 0 or (.name != "Gemini__ApiKey" and .name != "GOOGLE_GEMINI_API_KEY"))
          ))) +
          [
            {"name":"ASPNETCORE_ENVIRONMENT","value":"Production"},
            {"name":"Admin__AllowAnonymousSupportInDevelopment","value":"false"},
            {"name":"Supabase__JwtSecret","value":$jwt},
            {"name":"ASPNETCORE_URLS","value":"http://+:8080"},
            {"name":"DOTNET_RUNNING_IN_CONTAINER","value":"true"}
          ] +
          (if ($gcHeap | length) > 0 then [{"name":"DOTNET_GCHeapHardLimit","value":$gcHeap}] else [] end) +
          (if ($supUrl | length) > 0 then [{"name":"Supabase__Url","value":$supUrl},{"name":"SUPABASE_URL","value":$supUrl}] else [] end) +
          (if ($serviceRole | length) > 0 then [{"name":"Supabase__ServiceRoleKey","value":$serviceRole},{"name":"SUPABASE_SERVICE_ROLE_KEY","value":$serviceRole}] else [] end) +
          (if ($miloKey | length) > 0 then [{"name":"Milo__InternalServiceKey","value":$miloKey}] else [] end) +
          (if ($corsOrigin | length) > 0 then [{"name":"Cors__AllowedOrigins__0","value":$corsOrigin}] else [] end)
        )
        | if ($gem | length) > 0 then
            .secrets = (((.secrets // []) | map(select(.name != "Gemini__ApiKey"))) + [{"name":"Gemini__ApiKey","valueFrom":$gem}])
          else . end
      else . end
    )
' /tmp/td-full.json > /tmp/td-register.json

NEW_ARN="$(aws ecs register-task-definition --cli-input-json file:///tmp/td-register.json --region "$REGION" --query 'taskDefinition.taskDefinitionArn' --output text)"
aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --task-definition "$NEW_ARN" --force-new-deployment --region "$REGION" >/dev/null
echo "ECS task definition updated and service redeployed: $NEW_ARN"
if [ -n "$TASK_CPU" ] || [ -n "$TASK_MEMORY" ]; then
  echo "Task size: cpu=${TASK_CPU:-unchanged} memory=${TASK_MEMORY:-unchanged} (MiB)"
fi
if [ -n "$CPU_ARCH" ]; then
  echo "Runtime platform: cpuArchitecture=${CPU_ARCH} (image platform must match)"
fi
if [ -n "$EFFECTIVE_MEMORY_MIB" ] && [ "$EFFECTIVE_MEMORY_MIB" -le 1024 ] 2>/dev/null; then
  echo "::warning::Task memory is ${EFFECTIVE_MEMORY_MIB} MiB — PawBuck.API + Milo vision often needs ≥2048 MiB. Exit code 139/137 on startup usually means OOM, not a C# bug."
fi
if [ -n "$GC_HEAP_LIMIT" ]; then
  echo "DOTNET_GCHeapHardLimit=${GC_HEAP_LIMIT} bytes (~75% of task memory)"
fi
