#!/usr/bin/env bash
# Merge standard PawBuck.API env into the current ECS task definition, register, and update the service.
# Requires: aws, jq. Env: AWS_ECS_CLUSTER, AWS_ECS_SERVICE, AWS_REGION, SUPABASE_JWT_SECRET.
# Optional: AWS_ECS_CONTAINER_NAME (defaults to first container in the task definition).
# Optional: SUPABASE_PROJECT_URL — maps to Supabase__Url (same as project URL, e.g. https://REF.supabase.co). Often set from GitHub Variable VITE_SUPABASE_URL in deploy-aws.yml.
set -euo pipefail

CLUSTER="${AWS_ECS_CLUSTER:?Set AWS_ECS_CLUSTER}"
SERVICE="${AWS_ECS_SERVICE:?Set AWS_ECS_SERVICE}"
REGION="${AWS_REGION:?Set AWS_REGION}"
JWT_SECRET="${SUPABASE_JWT_SECRET:?Set SUPABASE_JWT_SECRET}"
CONTAINER_NAME="${AWS_ECS_CONTAINER_NAME:-}"
# Trim and strip trailing slash for Supabase project URL
SUPABASE_PROJECT_URL="${SUPABASE_PROJECT_URL:-}"
SUPABASE_PROJECT_URL="$(echo -n "$SUPABASE_PROJECT_URL" | tr -d '\r' | sed 's/[[:space:]]*$//' | sed 's#/*$##')"

TD_ARN="$(aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" --region "$REGION" --query 'services[0].taskDefinition' --output text)"
aws ecs describe-task-definition --task-definition "$TD_ARN" --region "$REGION" --query 'taskDefinition' > /tmp/td-full.json

if [ -z "$CONTAINER_NAME" ]; then
  CONTAINER_NAME="$(jq -r '.containerDefinitions[0].name' /tmp/td-full.json)"
fi

jq --arg jwt "$JWT_SECRET" --arg cname "$CONTAINER_NAME" --arg supUrl "$SUPABASE_PROJECT_URL" '
  del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy, .deregisteredAt)
  | .containerDefinitions |= map(
      if .name == $cname then
        .environment = (
          ((.environment // []) | map(select(
            .name != "ASPNETCORE_ENVIRONMENT" and
            .name != "Admin__AllowAnonymousSupportInDevelopment" and
            .name != "SUPABASE_JWT_SECRET" and
            .name != "ASPNETCORE_URLS" and
            .name != "Supabase__Url"
          ))) +
          [
            {"name":"ASPNETCORE_ENVIRONMENT","value":"Production"},
            {"name":"Admin__AllowAnonymousSupportInDevelopment","value":"false"},
            {"name":"SUPABASE_JWT_SECRET","value":$jwt},
            {"name":"ASPNETCORE_URLS","value":"http://+:8080"}
          ] +
          (if ($supUrl | length) > 0 then [{"name":"Supabase__Url","value":$supUrl}] else [] end)
        )
      else . end
    )
' /tmp/td-full.json > /tmp/td-register.json

NEW_ARN="$(aws ecs register-task-definition --cli-input-json file:///tmp/td-register.json --region "$REGION" --query 'taskDefinition.taskDefinitionArn' --output text)"
aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --task-definition "$NEW_ARN" --force-new-deployment --region "$REGION" >/dev/null
echo "ECS task definition updated and service redeployed: $NEW_ARN"
