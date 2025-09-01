#!/bin/bash

# Lisa App EKS Deployment Script
# This script builds, pushes to ECR, and deploys the Lisa App to EKS

set -e

# Configuration
AWS_REGION=${AWS_REGION:-"eu-west-1"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}
ECR_REPOSITORY_NAME="lisa-app"
IMAGE_NAME="lisa-app"
TAG=${TAG:-"latest"}
NAMESPACE=${NAMESPACE:-"lisa-app"}
ENVIRONMENT=${ENVIRONMENT:-"development"}
HELM_CHART_PATH="../../helm/lisa-app"
CREATE_ECR_REPO=${CREATE_ECR_REPO:-"false"}

# Supabase configuration (can be overridden via environment variables)
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-""}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-""}

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
    
    if ! command_exists kubectl; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! command_exists helm; then
        print_error "Helm is not installed or not in PATH"
        exit 1
    fi
    
    if ! command_exists aws; then
        print_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi
    
    # Check if kubectl is configured
    if ! kubectl cluster-info >/dev/null 2>&1; then
        print_error "kubectl is not configured or cluster is not accessible"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials are not configured or invalid"
        exit 1
    fi
    
    # Check if we're in the correct directory
    if [ ! -f "package.json" ] || [ ! -f "next.config.mjs" ]; then
        print_error "This script must be run from the lisa-app directory"
        exit 1
    fi
    
    # Check if Dockerfile exists in the root
    if [ ! -f "../../Dockerfile" ]; then
        print_error "Dockerfile not found in project root"
        exit 1
    fi
    
    # Check if Helm chart exists
    if [ ! -d "$HELM_CHART_PATH" ]; then
        print_error "Helm chart not found at $HELM_CHART_PATH"
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
    
    # Check if Supabase environment variables are set
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        print_warning "Supabase environment variables not set. Build may fail if they're required."
        print_info "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables if needed."
    fi
    
    # Build from the project root directory
    cd ../..
    
    # Build for linux/amd64 to ensure compatibility with EKS nodes
    docker buildx build \
        --platform linux/amd64 \
        --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
        --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
        -t ${IMAGE_NAME}:${TAG} .
    
    docker tag ${IMAGE_NAME}:${TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${TAG}
    
    # Return to lisa-app directory
    cd apps/lisa-app
    
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

# Deploy to Kubernetes
deploy_to_kubernetes() {
    print_status "Deploying to Kubernetes..."
    
    # Create namespace if it doesn't exist
    if [ "$NAMESPACE" != "default" ]; then
        kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    # Determine values file based on environment
    VALUES_FILE=""
    case $ENVIRONMENT in
        "production")
            if [ -f "${HELM_CHART_PATH}/values-production.yaml" ]; then
                VALUES_FILE="-f ${HELM_CHART_PATH}/values-production.yaml"
            else
                print_warning "Production values file not found, using default values"
            fi
            ;;
        "development")
            if [ -f "${HELM_CHART_PATH}/values-development.yaml" ]; then
                VALUES_FILE="-f ${HELM_CHART_PATH}/values-development.yaml"
            else
                print_warning "Development values file not found, using default values"
            fi
            ;;
        *)
            print_warning "Unknown environment: $ENVIRONMENT, using default values"
            ;;
    esac
    
    # Install or upgrade the Helm release
    if helm list -n $NAMESPACE | grep -q ${IMAGE_NAME}; then
        print_status "Upgrading existing Helm release..."
        helm upgrade ${IMAGE_NAME} ${HELM_CHART_PATH} \
            --namespace $NAMESPACE \
            --set image.repository=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME} \
            --set image.tag=${TAG} \
            --set image.pullPolicy=Always \
            $VALUES_FILE
    else
        print_status "Installing new Helm release..."
        helm install ${IMAGE_NAME} ${HELM_CHART_PATH} \
            --namespace $NAMESPACE \
            --set image.repository=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME} \
            --set image.tag=${TAG} \
            --set image.pullPolicy=Always \
            $VALUES_FILE
    fi
    
    print_status "Deployment completed successfully"
}

# Wait for deployment to be ready
wait_for_deployment() {
    print_status "Waiting for deployment to be ready..."
    
    kubectl wait --for=condition=available --timeout=300s deployment/${IMAGE_NAME} -n $NAMESPACE
    
    if [ $? -eq 0 ]; then
        print_status "Deployment is ready"
    else
        print_warning "Deployment timeout or failed - check pod status manually"
    fi
}

# Show deployment status
show_status() {
    print_status "Deployment status:"
    echo ""
    
    print_status "Pods:"
    kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=${IMAGE_NAME}
    echo ""
    
    print_status "Services:"
    kubectl get svc -n $NAMESPACE -l app.kubernetes.io/name=${IMAGE_NAME}
    echo ""
    
    print_status "Ingress:"
    kubectl get ingress -n $NAMESPACE -l app.kubernetes.io/name=${IMAGE_NAME}
    echo ""
    
    # Show access information
    print_status "Access information:"
    helm get notes ${IMAGE_NAME} -n $NAMESPACE
    echo ""
    
    print_info "ECR Image URI: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${TAG}"
    
    # Show pod logs if there are any issues
    print_status "Recent pod logs (last 10 lines):"
    POD_NAME=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=${IMAGE_NAME} -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$POD_NAME" ]; then
        kubectl logs --tail=10 -n $NAMESPACE $POD_NAME
    else
        print_warning "No pods found to show logs"
    fi
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
    print_status "Starting Lisa App ECR + EKS deployment process..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Namespace: $NAMESPACE"
    print_status "AWS Region: $AWS_REGION"
    print_status "ECR Repository: $ECR_REPOSITORY_NAME"
    print_status "Image Tag: $TAG"
    echo ""
    
    check_prerequisites
    get_aws_account_id
    create_ecr_repository
    authenticate_ecr
    build_image
    push_image
    deploy_to_kubernetes
    wait_for_deployment
    show_status
    cleanup_local_images
    
    print_status "Lisa App ECR + EKS deployment completed successfully!"
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
        --namespace)
            NAMESPACE="$2"
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
        --supabase-url)
            NEXT_PUBLIC_SUPABASE_URL="$2"
            shift 2
            ;;
        --supabase-anon-key)
            NEXT_PUBLIC_SUPABASE_ANON_KEY="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --region REGION        AWS region (default: us-west-2)"
            echo "  --account-id ID        AWS account ID (auto-detected if not provided)"
            echo "  --tag TAG             Docker image tag (default: latest)"
            echo "  --namespace NAMESPACE Kubernetes namespace (default: default)"
            echo "  --environment ENV     Environment: development or production (default: development)"
            echo "  --create-ecr-repo     Create ECR repository if it doesn't exist"
            echo "  --supabase-url URL    Supabase project URL"
            echo "  --supabase-anon-key KEY Supabase anonymous key"
            echo "  --help                Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  AWS_REGION                    AWS region"
            echo "  AWS_ACCOUNT_ID               AWS account ID"
            echo "  TAG                          Docker image tag"
            echo "  NAMESPACE                    Kubernetes namespace"
            echo "  ENVIRONMENT                  Environment"
            echo "  CREATE_ECR_REPO              Create ECR repository (true/false)"
            echo "  NEXT_PUBLIC_SUPABASE_URL     Supabase project URL"
            echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY Supabase anonymous key"
            echo ""
            echo "Prerequisites:"
            echo "  - AWS CLI configured with appropriate permissions"
            echo "  - Docker installed and running"
            echo "  - kubectl configured for your EKS cluster"
            echo "  - Helm installed"
            echo "  - Script must be run from the lisa-app directory"
            echo ""
            echo "Example:"
            echo "  $0 --environment production --tag v1.0.0 --namespace lisa-app"
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
