# Lanka Platform Database Infrastructure

# Neo4j Database Instance
resource "aws_key_pair" "neo4j" {
  key_name   = "${local.cluster_name}-neo4j-key"
  public_key = file("~/.ssh/id_rsa.pub") # Ensure SSH key exists
  
  tags = merge(local.tags, {
    Name = "${local.cluster_name}-neo4j-keypair"
  })
}

# Neo4j AMI data source
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# EBS volume for Neo4j data
resource "aws_ebs_volume" "neo4j_data" {
  availability_zone = data.aws_availability_zones.available.names[0]
  size              = var.neo4j_volume_size
  type              = var.neo4j_volume_type
  encrypted         = true
  kms_key_id        = var.enable_kms_encryption ? aws_kms_key.eks[0].arn : null

  tags = merge(local.tags, {
    Name = "${local.cluster_name}-neo4j-data"
    Backup = var.backup_enabled ? "enabled" : "disabled"
  })
}

# Neo4j Instance
resource "aws_instance" "neo4j" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.neo4j_instance_type
  key_name      = aws_key_pair.neo4j.key_name

  vpc_security_group_ids = [aws_security_group.neo4j.id]
  subnet_id              = module.vpc.private_subnets[0]
  availability_zone      = data.aws_availability_zones.available.names[0]

  # IAM role for CloudWatch and SSM
  iam_instance_profile = aws_iam_instance_profile.neo4j.name

  # User data for Neo4j installation and configuration
  user_data = templatefile("${path.module}/templates/neo4j-userdata.sh", {
    neo4j_version = var.neo4j_version
    cluster_name  = local.cluster_name
    environment   = var.environment
  })

  # EBS optimization
  ebs_optimized = true

  # Monitoring
  monitoring = var.monitoring_enabled

  # Metadata service configuration
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = merge(local.tags, {
    Name = "${local.cluster_name}-neo4j"
    Database = "neo4j"
    Backup = var.backup_enabled ? "enabled" : "disabled"
  })
}

# Attach EBS volume to Neo4j instance
resource "aws_volume_attachment" "neo4j_data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.neo4j_data.id
  instance_id = aws_instance.neo4j.id
}

# Neo4j IAM role
resource "aws_iam_role" "neo4j" {
  name = "${local.cluster_name}-neo4j-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

# Neo4j IAM policy
resource "aws_iam_role_policy" "neo4j" {
  name = "${local.cluster_name}-neo4j-policy"
  role = aws_iam_role.neo4j.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "ec2:DescribeVolumes",
          "ec2:DescribeTags",
          "logs:PutLogEvents",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogStreams",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.backups.arn}",
          "${aws_s3_bucket.backups.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "neo4j" {
  name = "${local.cluster_name}-neo4j-profile"
  role = aws_iam_role.neo4j.name

  tags = local.tags
}

# Redis ElastiCache Configuration
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.cluster_name}-redis-subnet-group"
  subnet_ids = module.vpc.database_subnets

  tags = merge(local.tags, {
    Name = "${local.cluster_name}-redis-subnet-group"
  })
}

resource "aws_elasticache_parameter_group" "redis" {
  family = "redis7.x"
  name   = "${local.cluster_name}-redis-params"

  # Performance and memory optimization parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  tags = local.tags
}

# Redis Replication Group (Cluster)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id         = "${local.cluster_name}-redis"
  description                  = "Redis cluster for Lanka platform"
  
  node_type                    = var.redis_node_type
  port                         = 6379
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  
  num_cache_clusters           = var.redis_num_cache_nodes
  engine_version               = var.redis_engine_version
  
  # Network and Security
  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  security_group_ids           = [aws_security_group.redis.id]
  
  # Backups
  automatic_failover_enabled   = var.redis_num_cache_nodes > 1
  multi_az_enabled            = var.redis_num_cache_nodes > 1
  snapshot_retention_limit     = var.backup_enabled ? var.backup_retention_days : 0
  snapshot_window             = "03:00-05:00"
  maintenance_window          = "sun:05:00-sun:09:00"
  
  # Encryption
  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = true
  auth_token                   = random_password.redis_auth.result
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = merge(local.tags, {
    Name = "${local.cluster_name}-redis-cluster"
    Database = "redis"
    Backup = var.backup_enabled ? "enabled" : "disabled"
  })
}

# Redis authentication token
resource "random_password" "redis_auth" {
  length  = 64
  special = false
}

# Store Redis auth token in AWS Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth" {
  name                    = "${local.cluster_name}/redis/auth"
  description             = "Redis authentication token"
  recovery_window_in_days = 0

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id     = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth.result
  })
}

# Redis CloudWatch log group
resource "aws_cloudwatch_log_group" "redis" {
  name              = "/aws/elasticache/${local.cluster_name}-redis"
  retention_in_days = 14
  kms_key_id        = var.enable_kms_encryption ? aws_kms_key.eks[0].arn : null

  tags = merge(local.tags, {
    Name = "${local.cluster_name}-redis-logs"
  })
}

# Database backups S3 bucket
resource "aws_s3_bucket" "backups" {
  bucket = "${local.cluster_name}-database-backups-${random_id.cluster.hex}"

  tags = merge(local.tags, {
    Name = "${local.cluster_name}-backups"
    Purpose = "database-backups"
  })
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "backups" {
  bucket = aws_s3_bucket.backups.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = var.enable_kms_encryption ? aws_kms_key.eks[0].arn : null
        sse_algorithm     = var.enable_kms_encryption ? "aws:kms" : "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  depends_on = [aws_s3_bucket_versioning.backups]
  bucket     = aws_s3_bucket.backups.id

  rule {
    id     = "backup_lifecycle"
    status = "Enabled"

    expiration {
      days = var.backup_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudWatch alarms for databases
resource "aws_cloudwatch_metric_alarm" "neo4j_cpu" {
  count               = var.monitoring_enabled ? 1 : 0
  alarm_name          = "${local.cluster_name}-neo4j-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors neo4j cpu utilization"

  dimensions = {
    InstanceId = aws_instance.neo4j.id
  }

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count               = var.monitoring_enabled ? 1 : 0
  alarm_name          = "${local.cluster_name}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors redis cpu utilization"

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.redis.replication_group_id}-001"
  }

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  count               = var.monitoring_enabled ? 1 : 0
  alarm_name          = "${local.cluster_name}-redis-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors redis memory utilization"

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.redis.replication_group_id}-001"
  }

  tags = local.tags
}