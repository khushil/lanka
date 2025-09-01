# Lanka Platform Terraform Backend Configuration
# This file sets up the S3 backend and DynamoDB table for state locking

# S3 bucket for Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_name}-terraform-state-${var.environment}-${random_id.cluster.hex}"

  tags = merge(local.tags, {
    Name    = "${var.project_name}-terraform-state"
    Purpose = "terraform-backend"
  })

  # Prevent accidental deletion of this S3 bucket
  lifecycle {
    prevent_destroy = true
  }
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.enable_kms_encryption ? aws_kms_key.eks[0].arn : null
      sse_algorithm     = var.enable_kms_encryption ? "aws:kms" : "AES256"
    }
    bucket_key_enabled = true
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket lifecycle configuration
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  depends_on = [aws_s3_bucket_versioning.terraform_state]
  bucket     = aws_s3_bucket.terraform_state.id

  rule {
    id     = "terraform_state_lifecycle"
    status = "Enabled"

    # Delete old versions after 90 days
    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    # Delete incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name           = "${var.project_name}-terraform-locks-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.enable_kms_encryption ? aws_kms_key.eks[0].arn : null
  }

  tags = merge(local.tags, {
    Name    = "${var.project_name}-terraform-locks"
    Purpose = "terraform-state-locking"
  })

  # Prevent accidental deletion of this DynamoDB table
  lifecycle {
    prevent_destroy = true
  }
}

# IAM role for Terraform execution
resource "aws_iam_role" "terraform_execution" {
  name = "${local.cluster_name}-terraform-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = ["ec2.amazonaws.com", "ecs-tasks.amazonaws.com"]
        }
      },
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = var.enable_irsa ? aws_iam_openid_connect_provider.eks[0].arn : null
        }
        Condition = var.enable_irsa ? {
          StringEquals = {
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:kube-system:terraform-operator"
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        } : null
      }
    ]
  })

  tags = local.tags
}

# IAM policy for Terraform execution
resource "aws_iam_role_policy" "terraform_execution" {
  name = "${local.cluster_name}-terraform-execution"
  role = aws_iam_role.terraform_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3 permissions for state management
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
      },
      # DynamoDB permissions for state locking
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = aws_dynamodb_table.terraform_locks.arn
      },
      # KMS permissions for encryption
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.enable_kms_encryption ? [aws_kms_key.eks[0].arn] : ["*"]
      },
      # EC2 permissions for infrastructure management
      {
        Effect = "Allow"
        Action = [
          "ec2:*",
          "elasticloadbalancing:*",
          "autoscaling:*",
          "cloudwatch:*",
          "logs:*"
        ]
        Resource = "*"
      },
      # EKS permissions
      {
        Effect = "Allow"
        Action = [
          "eks:*",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:CreateInstanceProfile",
          "iam:DeleteInstanceProfile",
          "iam:AddRoleToInstanceProfile",
          "iam:RemoveRoleFromInstanceProfile",
          "iam:PassRole"
        ]
        Resource = "*"
      },
      # ElastiCache permissions
      {
        Effect = "Allow"
        Action = [
          "elasticache:*"
        ]
        Resource = "*"
      },
      # Route53 permissions
      {
        Effect = "Allow"
        Action = [
          "route53:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM instance profile for EC2 instances
resource "aws_iam_instance_profile" "terraform_execution" {
  name = "${local.cluster_name}-terraform-execution"
  role = aws_iam_role.terraform_execution.name

  tags = local.tags
}

# Output the backend configuration for use in other environments
output "terraform_backend_config" {
  description = "Terraform backend configuration"
  value = {
    bucket         = aws_s3_bucket.terraform_state.bucket
    key            = "${var.environment}/terraform.tfstate"
    region         = data.aws_region.current.name
    encrypt        = true
    dynamodb_table = aws_dynamodb_table.terraform_locks.name
  }
}

# CloudWatch log group for Terraform operations
resource "aws_cloudwatch_log_group" "terraform_operations" {
  name              = "/aws/terraform/${local.cluster_name}"
  retention_in_days = 30
  kms_key_id        = var.enable_kms_encryption ? aws_kms_key.eks[0].arn : null

  tags = merge(local.tags, {
    Name    = "${local.cluster_name}-terraform-logs"
    Purpose = "terraform-operations"
  })
}

# SNS topic for Terraform notifications
resource "aws_sns_topic" "terraform_notifications" {
  name = "${local.cluster_name}-terraform-notifications"

  kms_master_key_id = var.enable_kms_encryption ? aws_kms_key.eks[0].arn : null

  tags = merge(local.tags, {
    Name    = "${local.cluster_name}-terraform-notifications"
    Purpose = "terraform-notifications"
  })
}

# CloudWatch alarm for Terraform state access
resource "aws_cloudwatch_metric_alarm" "terraform_state_errors" {
  count               = var.monitoring_enabled ? 1 : 0
  alarm_name          = "${local.cluster_name}-terraform-state-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4xxError"
  namespace           = "AWS/S3"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors errors accessing Terraform state"
  alarm_actions       = [aws_sns_topic.terraform_notifications.arn]

  dimensions = {
    BucketName = aws_s3_bucket.terraform_state.bucket
  }

  tags = local.tags
}