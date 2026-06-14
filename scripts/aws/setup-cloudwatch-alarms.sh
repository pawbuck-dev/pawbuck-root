#!/usr/bin/env bash
# Deploy PawBuck API CloudWatch alarms (ALB 5xx + unhealthy targets).
# Requires: AWS CLI, IAM permission cloudformation:CreateStack / UpdateStack.
#
# Usage:
#   export AWS_REGION=us-east-1
#   export PAWBUCK_ALB_FULL_NAME='app/pawbuck-api/abc123def456'
#   export PAWBUCK_TG_FULL_NAME='targetgroup/pawbuck-api-tg/abc123def456'
#   export PAWBUCK_ALARM_SNS_ARN=''   # optional
#   ./scripts/aws/setup-cloudwatch-alarms.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STACK_NAME="${PAWBUCK_CLOUDWATCH_STACK_NAME:-pawbuck-api-alarms}"
REGION="${AWS_REGION:-us-east-1}"
ALB="${PAWBUCK_ALB_FULL_NAME:-}"
TG="${PAWBUCK_TG_FULL_NAME:-}"
SNS="${PAWBUCK_ALARM_SNS_ARN:-}"

if [[ -z "$ALB" || -z "$TG" ]]; then
  echo "Set PAWBUCK_ALB_FULL_NAME and PAWBUCK_TG_FULL_NAME (ALB/Target group full names from EC2 console)." >&2
  exit 1
fi

PARAMS=(
  "ParameterKey=LoadBalancerFullName,ParameterValue=${ALB}"
  "ParameterKey=TargetGroupFullName,ParameterValue=${TG}"
  "ParameterKey=SnsTopicArn,ParameterValue=${SNS}"
)

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "Updating stack $STACK_NAME in $REGION..."
  aws cloudformation update-stack \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --template-body "file://${ROOT}/infra/cloudwatch-api-alarms.yaml" \
    --parameters "${PARAMS[@]}" \
    --capabilities CAPABILITY_IAM
else
  echo "Creating stack $STACK_NAME in $REGION..."
  aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --template-body "file://${ROOT}/infra/cloudwatch-api-alarms.yaml" \
    --parameters "${PARAMS[@]}" \
    --capabilities CAPABILITY_IAM
fi

echo "Done. Confirm alarms in CloudWatch → Alarms (region: $REGION)."
