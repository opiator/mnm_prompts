# Helm Chart for MNM Prompts

This Helm chart deploys the MNM Prompts application with support for AWS Secrets Manager integration.

## Quick Setup

We've provided two helper scripts to make setup easier:

1. **Setup AWS Secret**: `./setup-aws-secrets.sh`
2. **Setup IAM Role**: `./setup-iam-role.sh`

## AWS Secrets Manager Setup

### 1. Create AWS Secret

Run the setup script to create your AWS secret:

```bash
cd helm
./setup-aws-secrets.sh
```

This creates a single AWS Secrets Manager secret containing all your application environment variables as a JSON key-value map.

### 2. Create Dedicated IAM Role for Service Account (IRSA)

**Important**: We use a dedicated service account for MNM Prompts, not a shared one. This follows security best practices.

Run the IAM setup script:

```bash
cd helm
./setup-iam-role.sh
```

This script will:
- Create a dedicated IAM role `mnm-prompts-secrets-role`
- Configure the trust policy for your EKS cluster
- Create a policy with minimal permissions (only access to your specific secret)
- Attach the policy to the role

### 3. Configure Helm Values

Your production values file (`helm/values-production.yaml`) is already configured:

```yaml
aws:
  region: eu-west-1
  secretsManager:
    enabled: true
    appSecrets: mnm-prompts-prod-secrets
  serviceAccount:
    roleArn: arn:aws:iam::767624311656:role/mnm-prompts-secrets-role
```

### 4. Deploy the Chart

```bash
helm upgrade --install mnm-prompts ./helm \
  --values helm/values-production.yaml \
  --namespace default
```

## How It Works

1. **External Secrets Operator** watches the `ExternalSecret` resource
2. It connects to AWS Secrets Manager using your dedicated service account's IAM role
3. It extracts all key-value pairs from the specified secret
4. It creates a Kubernetes `Secret` with all the extracted values
5. The deployment uses `envFrom` to load all environment variables from this secret

## Adding/Updating Secrets

To add new environment variables or update existing ones:

1. Update the AWS Secrets Manager secret:
```bash
aws secretsmanager update-secret \
  --secret-id "mnm-prompts-prod-secrets" \
  --secret-string '{
    "DATABASE_URL": "postgresql://user:pass@host:5432/db",
    "SUPABASE_URL": "https://your-project.supabase.co",
    "SUPABASE_ANON_KEY": "your-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
    "JWT_SECRET": "your-jwt-secret",
    "NEXTAUTH_SECRET": "your-nextauth-secret",
    "NEXTAUTH_URL": "https://your-domain.com",
    "NEW_VARIABLE": "new-value"
  }'
```

2. External Secrets will automatically detect the change and update the Kubernetes secret
3. The pod will automatically restart to pick up the new environment variables

## Security Benefits of Dedicated Service Account

- **Isolation**: Each app has its own IAM role with minimal permissions
- **Principle of Least Privilege**: Only access to specific secrets needed by the app
- **Auditability**: Clear separation of which app has access to what
- **Compliance**: Easier to meet security and compliance requirements
- **Maintenance**: Changes to one app's permissions don't affect others

## Prerequisites

- External Secrets Operator installed in your cluster
- AWS EKS cluster with OIDC provider configured
- AWS CLI configured with appropriate permissions

## Troubleshooting

### Check External Secret Status
```bash
kubectl get externalsecret
kubectl describe externalsecret mnm-prompts-app-secrets
```

### Check Secret Store Status
```bash
kubectl get secretstore
kubectl describe secretstore mnm-prompts-aws-secrets
```

### Check Generated Kubernetes Secret
```bash
kubectl get secret mnm-prompts-app-secrets -o yaml
```

### Check Pod Environment Variables
```bash
kubectl exec -it deployment/mnm-prompts -- env | grep -E "(DATABASE_URL|SUPABASE|JWT|NEXTAUTH)"
```

### Check IAM Role
```bash
aws iam get-role --role-name mnm-prompts-secrets-role
aws iam list-attached-role-policies --role-name mnm-prompts-secrets-role
```
