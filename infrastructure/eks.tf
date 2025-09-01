# Lanka Platform EKS Configuration

# KMS key for EKS cluster encryption
resource "aws_kms_key" "eks" {
  count                   = var.enable_kms_encryption ? 1 : 0
  description             = "EKS cluster encryption key for ${local.cluster_name}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.tags, {
    Name = "${local.cluster_name}-eks-encryption-key"
  })
}

resource "aws_kms_alias" "eks" {
  count         = var.enable_kms_encryption ? 1 : 0
  name          = "alias/${local.cluster_name}-eks"
  target_key_id = aws_kms_key.eks[0].key_id
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = local.cluster_name
  cluster_version = var.cluster_version

  # Network Configuration
  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_private_access = var.cluster_endpoint_private_access
  cluster_endpoint_public_access  = var.cluster_endpoint_public_access
  cluster_endpoint_public_access_cidrs = var.cluster_endpoint_public_access_cidrs

  # Security
  cluster_encryption_config = var.enable_kms_encryption ? [
    {
      provider_key_arn = aws_kms_key.eks[0].arn
      resources        = ["secrets"]
    }
  ] : []

  # Logging
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  cloudwatch_log_group_retention_in_days = 14

  # IRSA (IAM Roles for Service Accounts)
  enable_irsa = var.enable_irsa

  # Cluster security group additional rules
  cluster_security_group_additional_rules = {
    egress_nodes_ephemeral_ports_tcp = {
      description                = "To node 1025-65535"
      protocol                   = "tcp"
      from_port                  = 1025
      to_port                    = 65535
      type                       = "egress"
      source_node_security_group = true
    }
  }

  # Node security group additional rules
  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
    egress_all = {
      description      = "Node all egress"
      protocol         = "-1"
      from_port        = 0
      to_port          = 0
      type             = "egress"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = ["::/0"]
    }
  }

  # EKS Managed Node Groups
  eks_managed_node_groups = {
    for name, config in var.node_groups : name => {
      name            = "${local.cluster_name}-${name}"
      use_name_prefix = false
      
      instance_types = config.instance_types
      capacity_type  = config.capacity_type
      
      min_size     = config.min_size
      max_size     = config.max_size
      desired_size = config.desired_size

      ami_type = "AL2_x86_64"
      
      # Disk configuration
      disk_size = 50
      disk_type = "gp3"
      disk_encrypted = true
      disk_kms_key_id = var.enable_kms_encryption ? aws_kms_key.eks[0].arn : null

      # User data for node configuration
      pre_bootstrap_user_data = <<-EOT
        #!/bin/bash
        /etc/eks/bootstrap.sh ${local.cluster_name}
        
        # Install CloudWatch agent
        wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
        rpm -U ./amazon-cloudwatch-agent.rpm
        
        # Configure log forwarding
        echo '{"logs":{"logs_collected":{"files":{"collect_list":[{"file_path":"/var/log/messages","log_group_name":"${local.cluster_name}-system-logs","log_stream_name":"{instance_id}"}]}}}}' > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
        /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
      EOT

      # Labels and taints
      labels = merge(config.labels, {
        Environment = var.environment
        NodeGroup   = name
      })

      taints = config.taints

      # Instance profile
      create_iam_role = true
      iam_role_name   = "${local.cluster_name}-${name}-node-role"
      iam_role_use_name_prefix = false
      
      iam_role_additional_policies = {
        AmazonEKSWorkerNodePolicy          = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
        AmazonEKS_CNI_Policy              = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
        AmazonEC2ContainerRegistryReadOnly = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
        CloudWatchAgentServerPolicy       = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
        AmazonSSMManagedInstanceCore      = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
      }

      # Security groups
      vpc_security_group_ids = [
        module.eks.cluster_security_group_id,
        aws_security_group.worker_nodes.id
      ]

      tags = merge(local.tags, {
        Name = "${local.cluster_name}-${name}-node"
        "k8s.io/cluster-autoscaler/${local.cluster_name}" = "owned"
        "k8s.io/cluster-autoscaler/enabled" = var.cluster_autoscaler_enabled ? "true" : "false"
      })
    }
  }

  # Fargate profiles for serverless workloads
  fargate_profiles = {
    kube_system = {
      name = "kube-system"
      selectors = [
        {
          namespace = "kube-system"
          labels = {
            "app.kubernetes.io/name" = "aws-load-balancer-controller"
          }
        }
      ]
    }
    
    monitoring = {
      name = "monitoring"
      selectors = [
        {
          namespace = "monitoring"
        }
      ]
    }
  }

  tags = local.tags
}

# Worker nodes security group
resource "aws_security_group" "worker_nodes" {
  name_prefix = "${local.cluster_name}-worker-nodes"
  description = "Security group for EKS worker nodes"
  vpc_id      = module.vpc.vpc_id

  # Allow nodes to communicate with each other
  ingress {
    description = "Node to node communication"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  # Allow pods to communicate with the cluster API Server
  ingress {
    description = "Cluster API to nodes"
    from_port   = 1025
    to_port     = 65535
    protocol    = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, {
    Name = "${local.cluster_name}-worker-nodes-sg"
  })
}

# CloudWatch Log Groups for container logs
resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${local.cluster_name}/cluster"
  retention_in_days = 14
  kms_key_id        = var.enable_kms_encryption ? aws_kms_key.eks[0].arn : null

  tags = merge(local.tags, {
    Name = "${local.cluster_name}-cluster-logs"
  })
}

resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/aws/eks/${local.cluster_name}/application"
  retention_in_days = 7
  kms_key_id        = var.enable_kms_encryption ? aws_kms_key.eks[0].arn : null

  tags = merge(local.tags, {
    Name = "${local.cluster_name}-application-logs"
  })
}

# OIDC provider for IRSA
data "tls_certificate" "eks" {
  url = module.eks.cluster_oidc_issuer_url
}

resource "aws_iam_openid_connect_provider" "eks" {
  count = var.enable_irsa ? 1 : 0
  
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = module.eks.cluster_oidc_issuer_url

  tags = merge(local.tags, {
    Name = "${local.cluster_name}-oidc-provider"
  })
}

# IAM role for AWS Load Balancer Controller
resource "aws_iam_role" "aws_load_balancer_controller" {
  count = var.enable_irsa ? 1 : 0
  name  = "${local.cluster_name}-aws-load-balancer-controller"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks[0].arn
        }
      }
    ]
  })

  tags = local.tags
}

# Load Balancer Controller IAM policy
resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller" {
  count      = var.enable_irsa ? 1 : 0
  policy_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/AWSLoadBalancerControllerIAMPolicy"
  role       = aws_iam_role.aws_load_balancer_controller[0].name
}

# Cluster Autoscaler IAM role
resource "aws_iam_role" "cluster_autoscaler" {
  count = var.cluster_autoscaler_enabled && var.enable_irsa ? 1 : 0
  name  = "${local.cluster_name}-cluster-autoscaler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:kube-system:cluster-autoscaler"
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks[0].arn
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy" "cluster_autoscaler" {
  count = var.cluster_autoscaler_enabled && var.enable_irsa ? 1 : 0
  name  = "${local.cluster_name}-cluster-autoscaler"
  role  = aws_iam_role.cluster_autoscaler[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeTags",
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup",
          "ec2:DescribeLaunchTemplateVersions"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}