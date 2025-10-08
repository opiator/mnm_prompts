#!/bin/bash

# mnm-prompts AWS App Runner Deployment Script
# This script builds, pushes to ECR, and deploys the mnm-prompts app to App Runner

set -e

# Configuration
AWS_REGION=${AWS_REGION:-"eu-west-1"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}
ECR_REPOSITORY_NAME="mnm-prompts"
IMAGE_NAME="mnm-prompts"
TAG=${TAG:-"latest"}
APP_RUNNER_SERVICE_NAME="mnm-prompts"
ENVIRONMENT=${ENVIRONMENT:-"production"}
CREATE_ECR_REPO=${CREATE_ECR_REPO:-"false"}

# App Runner Configuration
APP_RUNNER_CPU=${APP_RUNNER_CPU:-"0.25"}  # 0.25 vCPU, 1 vCPU, or 2 vCPU
APP_RUNNER_MEMORY=${APP_RUNNER_MEMORY:-"0.5"}  # 0.5 GB, 2 GB, 3 GB, or 4 GB
APP_RUNNER_MIN_SIZE=${APP_RUNNER_MIN_SIZE:-"1"}
APP_RUNNER_MAX_SIZE=${APP_RUNNER_MAX_SIZE:-"1"}
APP_RUNNER_AUTO_PAUSE=${APP_RUNNER_AUTO_PAUSE:-"true"}  # Auto-pause when idle to save costs

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    if ! command_exists docker; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! command_exists aws; then
        print_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials are not configured or invalid"
        exit 1
    fi

    # Check if we're in the correct directory
    if [ ! -f "package.json" ] || [ ! -f "next.config.ts" ]; then
        print_error "This script must be run from the mnm-prompts project root directory"
        exit 1
    fi

    # Check if Dockerfile exists in the root
    if [ ! -f "Dockerfile" ]; then
        print_error "Dockerfile not found in project root"
        exit 1
    fi

    print_status "All prerequisites are met"
}

# Get AWS account ID
get_aws_account_id() {
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        print_info "Getting AWS account ID..."
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        if [ -z "$AWS_ACCOUNT_ID" ]; then
            print_error "Failed to get AWS account ID"
            exit 1
        fi
        print_status "AWS Account ID: $AWS_ACCOUNT_ID"
    fi
}

# Create ECR repository if it doesn't exist
create_ecr_repository() {
    if [ "$CREATE_ECR_REPO" = "true" ]; then
        print_info "Checking if ECR repository exists..."

        if ! aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --region $AWS_REGION >/dev/null 2>&1; then
            print_status "Creating ECR repository: $ECR_REPOSITORY_NAME"
            aws ecr create-repository \
                --repository-name $ECR_REPOSITORY_NAME \
                --region $AWS_REGION \
                --image-scanning-configuration scanOnPush=true \
                --encryption-configuration encryptionType=AES256

            print_status "ECR repository created successfully"
        else
            print_status "ECR repository already exists"
        fi
    else
        print_info "Skipping ECR repository creation (use --create-ecr-repo to enable)"
    fi
}

# Authenticate Docker to ECR
authenticate_ecr() {
    print_info "Authenticating Docker to ECR..."

    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

    if [ $? -eq 0 ]; then
        print_status "Successfully authenticated to ECR"
    else
        print_error "Failed to authenticate to ECR"
        exit 1
    fi
}

# Build Docker image
build_image() {
    print_status "Building Docker image..."

    # Build for linux/amd64 to ensure compatibility
    docker buildx build \
        --platform linux/amd64 \
        -t ${IMAGE_NAME}:${TAG} .

    docker tag ${IMAGE_NAME}:${TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${TAG}

    print_status "Docker image built successfully"
}

# Push Docker image to ECR
push_image() {
    print_status "Pushing Docker image to ECR..."

    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${TAG}

    if [ $? -eq 0 ]; then
        print_status "Docker image pushed successfully to ECR"
        print_info "Image URI: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${TAG}"
    else
        print_error "Failed to push image to ECR"
        exit 1
    fi
}

# Create or update App Runner service
deploy_to_apprunner() {
    print_status "Deploying to AWS App Runner..."

    IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${TAG}"

    # Check if service exists
    SERVICE_ARN=$(aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='${APP_RUNNER_SERVICE_NAME}'].ServiceArn" --output text 2>/dev/null || echo "")

    if [ -z "$SERVICE_ARN" ]; then
        print_status "Creating new App Runner service..."

        # Create IAM role for ECR access if it doesn't exist
        ECR_ROLE_NAME="mnm-prompts-apprunner-ecr-role"
        ECR_ROLE_ARN=$(aws iam get-role --role-name $ECR_ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")

        if [ -z "$ECR_ROLE_ARN" ]; then
            print_info "Creating IAM role for ECR access..."

            # Create trust policy for ECR access
            cat > /tmp/ecr-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

            aws iam create-role \
                --role-name $ECR_ROLE_NAME \
                --assume-role-policy-document file:///tmp/ecr-trust-policy.json

            aws iam attach-role-policy \
                --role-name $ECR_ROLE_NAME \
                --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess

            ECR_ROLE_ARN=$(aws iam get-role --role-name $ECR_ROLE_NAME --query 'Role.Arn' --output text)

            print_status "ECR access role created: $ECR_ROLE_ARN"
        fi

        # Create IAM role for instance (secrets access) if it doesn't exist
        INSTANCE_ROLE_NAME="mnm-prompts-apprunner-instance-role"
        INSTANCE_ROLE_ARN=$(aws iam get-role --role-name $INSTANCE_ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")

        if [ -z "$INSTANCE_ROLE_ARN" ]; then
            print_info "Creating IAM role for instance (secrets access)..."

            # Create trust policy for App Runner tasks
            cat > /tmp/instance-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "tasks.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

            aws iam create-role \
                --role-name $INSTANCE_ROLE_NAME \
                --assume-role-policy-document file:///tmp/instance-trust-policy.json \
                --description "Instance role for mnm-prompts App Runner service - restricted access to specific secrets only"

            # Create inline policy for SPECIFIC secret access only
            cat > /tmp/secrets-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:mnm-prompts-prod-secrets-*"
      ]
    }
  ]
}
EOF

            aws iam put-role-policy \
                --role-name $INSTANCE_ROLE_NAME \
                --policy-name "SecretsManagerAccess" \
                --policy-document file:///tmp/secrets-policy.json

            INSTANCE_ROLE_ARN=$(aws iam get-role --role-name $INSTANCE_ROLE_NAME --query 'Role.Arn' --output text)

            print_status "Instance role created: $INSTANCE_ROLE_ARN"
            print_status "✓ Instance role has access ONLY to: mnm-prompts-prod-secrets"
            print_warning "Waiting 10 seconds for IAM roles to propagate..."
            sleep 10
        fi

        # Create App Runner service
        aws apprunner create-service \
            --service-name $APP_RUNNER_SERVICE_NAME \
            --region $AWS_REGION \
            --source-configuration "{
                \"ImageRepository\": {
                    \"ImageIdentifier\": \"${IMAGE_URI}\",
                    \"ImageConfiguration\": {
                        \"Port\": \"3000\",
                        \"RuntimeEnvironmentVariables\": {
                            \"NODE_ENV\": \"production\",
                            \"PORT\": \"3000\",
                            \"HOSTNAME\": \"0.0.0.0\",
                            \"NEXT_TELEMETRY_DISABLED\": \"1\"
                        },
                        \"RuntimeEnvironmentSecrets\": {
                            \"DATABASE_URL\": \"arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:mnm-prompts-prod-secrets:DATABASE_URL::\",
                            \"DIRECT_URL\": \"arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:mnm-prompts-prod-secrets:DIRECT_URL::\",
                            \"SITE_PASSWORD\": \"arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:mnm-prompts-prod-secrets:SITE_PASSWORD::\",
                            \"AUTH_SECRET\": \"arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:mnm-prompts-prod-secrets:AUTH_SECRET::\"
                        }
                    },
                    \"ImageRepositoryType\": \"ECR\"
                },
                \"AuthenticationConfiguration\": {
                    \"AccessRoleArn\": \"${ECR_ROLE_ARN}\"
                },
                \"AutoDeploymentsEnabled\": false
            }" \
            --instance-configuration "{
                \"Cpu\": \"${APP_RUNNER_CPU} vCPU\",
                \"Memory\": \"${APP_RUNNER_MEMORY} GB\",
                \"InstanceRoleArn\": \"${INSTANCE_ROLE_ARN}\"
            }" \
            --health-check-configuration "{
                \"Protocol\": \"HTTP\",
                \"Path\": \"/api/healthcheck\",
                \"Interval\": 5,
                \"Timeout\": 2,
                \"HealthyThreshold\": 1,
                \"UnhealthyThreshold\": 3
            }" \
            --auto-scaling-configuration-arn "arn:aws:apprunner:${AWS_REGION}:${AWS_ACCOUNT_ID}:autoscalingconfiguration/DefaultConfiguration/1/00000000000000000000000000000001" \
            > /tmp/apprunner-create.json

        SERVICE_ARN=$(cat /tmp/apprunner-create.json | grep -o '"ServiceArn": "[^"]*"' | cut -d'"' -f4)
        print_status "App Runner service created: $SERVICE_ARN"

        # Note: Auto-pause will be enabled after service is running
        if [ "$APP_RUNNER_AUTO_PAUSE" = "true" ]; then
            print_info "Auto-pause will be enabled after service becomes operational..."
        fi
    else
        print_status "Updating existing App Runner service..."

        # Get instance role ARN for updates
        INSTANCE_ROLE_NAME="mnm-prompts-apprunner-instance-role"
        INSTANCE_ROLE_ARN=$(aws iam get-role --role-name $INSTANCE_ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")

        aws apprunner update-service \
            --service-arn $SERVICE_ARN \
            --region $AWS_REGION \
            --source-configuration "{
                \"ImageRepository\": {
                    \"ImageIdentifier\": \"${IMAGE_URI}\",
                    \"ImageConfiguration\": {
                        \"Port\": \"3000\",
                        \"RuntimeEnvironmentVariables\": {
                            \"NODE_ENV\": \"production\",
                            \"PORT\": \"3000\",
                            \"HOSTNAME\": \"0.0.0.0\",
                            \"NEXT_TELEMETRY_DISABLED\": \"1\"
                        },
                        \"RuntimeEnvironmentSecrets\": {
                            \"DATABASE_URL\": \"arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:mnm-prompts-prod-secrets:DATABASE_URL::\",
                            \"DIRECT_URL\": \"arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:mnm-prompts-prod-secrets:DIRECT_URL::\",
                            \"SITE_PASSWORD\": \"arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:mnm-prompts-prod-secrets:SITE_PASSWORD::\",
                            \"AUTH_SECRET\": \"arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:mnm-prompts-prod-secrets:AUTH_SECRET::\"
                        }
                    },
                    \"ImageRepositoryType\": \"ECR\"
                },
                \"AutoDeploymentsEnabled\": false
            }" \
            --instance-configuration "{
                \"Cpu\": \"${APP_RUNNER_CPU} vCPU\",
                \"Memory\": \"${APP_RUNNER_MEMORY} GB\",
                \"InstanceRoleArn\": \"${INSTANCE_ROLE_ARN}\"
            }" \
            --health-check-configuration "{
                \"Protocol\": \"HTTP\",
                \"Path\": \"/api/healthcheck\",
                \"Interval\": 5,
                \"Timeout\": 2,
                \"HealthyThreshold\": 1,
                \"UnhealthyThreshold\": 3
            }" > /dev/null

        print_status "App Runner service updated"
    fi
}

# Wait for deployment to be ready
wait_for_deployment() {
    print_status "Waiting for App Runner service to be ready..."

    SERVICE_ARN=$(aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='${APP_RUNNER_SERVICE_NAME}'].ServiceArn" --output text)

    for i in {1..60}; do
        STATUS=$(aws apprunner describe-service --service-arn $SERVICE_ARN --region $AWS_REGION --query 'Service.Status' --output text)

        if [ "$STATUS" = "RUNNING" ]; then
            print_status "Service is running!"

            # Enable auto-pause now that service is operational
            if [ "$APP_RUNNER_AUTO_PAUSE" = "true" ]; then
                print_info "Enabling auto-pause to save costs when idle..."
                if aws apprunner update-service \
                    --service-arn $SERVICE_ARN \
                    --region $AWS_REGION \
                    --auto-scaling-configuration-arn "arn:aws:apprunner:${AWS_REGION}:${AWS_ACCOUNT_ID}:autoscalingconfiguration/DefaultConfiguration/2/00000000000000000000000000000001" \
                    > /dev/null 2>&1; then
                    print_status "✓ Auto-pause enabled (pauses after 5 minutes of inactivity)"
                else
                    print_warning "Could not enable auto-pause automatically. You can enable it manually in the AWS Console."
                fi
            fi

            return 0
        elif [ "$STATUS" = "CREATE_FAILED" ] || [ "$STATUS" = "UPDATE_FAILED" ]; then
            print_error "Service deployment failed with status: $STATUS"
            return 1
        fi

        print_info "Current status: $STATUS (attempt $i/60)"
        sleep 10
    done

    print_warning "Timeout waiting for service to be ready"
    return 1
}

# Show deployment status
show_status() {
    print_status "Deployment status:"
    echo ""

    SERVICE_ARN=$(aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='${APP_RUNNER_SERVICE_NAME}'].ServiceArn" --output text)

    SERVICE_INFO=$(aws apprunner describe-service --service-arn $SERVICE_ARN --region $AWS_REGION)

    SERVICE_URL=$(echo "$SERVICE_INFO" | grep -o '"ServiceUrl": "[^"]*"' | cut -d'"' -f4)
    STATUS=$(echo "$SERVICE_INFO" | grep -o '"Status": "[^"]*"' | cut -d'"' -f4)

    print_status "Service Status: $STATUS"
    print_status "Service URL: https://$SERVICE_URL"
    print_info "Image URI: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${TAG}"
    echo ""

    print_info "To associate a custom domain:"
    echo "  aws apprunner associate-custom-domain \\"
    echo "    --service-arn $SERVICE_ARN \\"
    echo "    --domain-name prompts.mnm.dev \\"
    echo "    --region $AWS_REGION"
    echo ""
}

# Clean up local images
cleanup_local_images() {
    print_info "Cleaning up local Docker images..."

    docker rmi ${IMAGE_NAME}:${TAG} 2>/dev/null || true
    docker rmi ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${TAG} 2>/dev/null || true

    print_status "Local cleanup completed"
}

# Main deployment function
main() {
    print_status "Starting mnm-prompts App Runner deployment process..."
    print_status "Environment: $ENVIRONMENT"
    print_status "AWS Region: $AWS_REGION"
    print_status "ECR Repository: $ECR_REPOSITORY_NAME"
    print_status "Image Tag: $TAG"
    print_status "App Runner Service: $APP_RUNNER_SERVICE_NAME"
    print_status "CPU: $APP_RUNNER_CPU vCPU, Memory: $APP_RUNNER_MEMORY GB"
    if [ "$APP_RUNNER_AUTO_PAUSE" = "true" ]; then
        print_status "Auto-pause: Enabled (saves costs when idle)"
    else
        print_status "Auto-pause: Disabled (always running)"
    fi
    echo ""

    check_prerequisites
    get_aws_account_id
    create_ecr_repository
    authenticate_ecr
    build_image
    push_image
    deploy_to_apprunner
    wait_for_deployment
    show_status
    cleanup_local_images

    print_status "mnm-prompts App Runner deployment completed successfully!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --account-id)
            AWS_ACCOUNT_ID="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --service-name)
            APP_RUNNER_SERVICE_NAME="$2"
            shift 2
            ;;
        --cpu)
            APP_RUNNER_CPU="$2"
            shift 2
            ;;
        --memory)
            APP_RUNNER_MEMORY="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --create-ecr-repo)
            CREATE_ECR_REPO="true"
            shift
            ;;
        --no-auto-pause)
            APP_RUNNER_AUTO_PAUSE="false"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --region REGION          AWS region (default: eu-west-1)"
            echo "  --account-id ID          AWS account ID (auto-detected if not provided)"
            echo "  --tag TAG                Docker image tag (default: latest)"
            echo "  --service-name NAME      App Runner service name (default: mnm-prompts)"
            echo "  --cpu CPU                vCPU allocation: 0.25, 1, or 2 (default: 0.25)"
            echo "  --memory MEMORY          Memory in GB: 0.5, 2, 3, or 4 (default: 0.5)"
            echo "  --environment ENV        Environment: production (default: production)"
            echo "  --create-ecr-repo        Create ECR repository if it doesn't exist"
            echo "  --no-auto-pause          Disable auto-pause (enabled by default)"
            echo "  --help                   Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  AWS_REGION               AWS region"
            echo "  AWS_ACCOUNT_ID           AWS account ID"
            echo "  TAG                      Docker image tag"
            echo "  ENVIRONMENT              Environment"
            echo "  CREATE_ECR_REPO          Create ECR repository (true/false)"
            echo ""
            echo "Prerequisites:"
            echo "  - AWS CLI configured with appropriate permissions"
            echo "  - Docker installed and running"
            echo "  - Script must be run from the mnm-prompts project root directory"
            echo "  - Secrets configured in AWS Secrets Manager (mnm-prompts-prod-secrets)"
            echo ""
            echo "Example:"
            echo "  $0 --environment production --tag v1.0.0"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main
