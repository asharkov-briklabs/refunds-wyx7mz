# main.tf for AWS networking infrastructure module
# Creates networking components for Refunds Service with security, high availability, and compliance in mind
# AWS provider version ~> 4.0

# Locals for naming and tagging
locals {
  name_prefix = var.name_prefix
  
  # Common tags to be assigned to all resources
  common_tags = {
    Environment = var.environment
    Project     = "Refunds-Service"
    ManagedBy   = "Terraform"
    Owner       = var.owner
  }
  
  # Dynamically determine the number of AZs to use
  az_count = length(var.availability_zones)
  
  # Use only one NAT Gateway if single_nat_gateway is true, otherwise use one per AZ
  nat_gateway_count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : local.az_count) : 0
}

#---------------------------------------
# VPC Creation
#---------------------------------------
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = var.enable_dns_support
  enable_dns_hostnames = var.enable_dns_hostnames
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-vpc"
    }
  )
}

#---------------------------------------
# Subnet Creation
#---------------------------------------
# Public subnets - for ALBs, NAT Gateways, etc.
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index % local.az_count]
  map_public_ip_on_launch = true
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-public-subnet-${count.index + 1}"
      Tier = "Public"
      "kubernetes.io/role/elb" = "1"  # Tag for Kubernetes ELB if used
    }
  )
}

# Private application subnets - for application servers, containers, etc.
resource "aws_subnet" "private_app" {
  count                   = length(var.private_app_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_app_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index % local.az_count]
  map_public_ip_on_launch = false
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-private-app-subnet-${count.index + 1}"
      Tier = "Private-App"
      "kubernetes.io/role/internal-elb" = "1"  # Tag for Kubernetes internal ELB if used
    }
  )
}

# Private data subnets - for databases, caches, etc.
resource "aws_subnet" "private_data" {
  count                   = length(var.private_data_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_data_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index % local.az_count]
  map_public_ip_on_launch = false
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-private-data-subnet-${count.index + 1}"
      Tier = "Private-Data"
    }
  )
}

#---------------------------------------
# Internet & NAT Gateways
#---------------------------------------
# Internet Gateway for public subnets
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-igw"
    }
  )
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? local.nat_gateway_count : 0
  vpc   = true
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-nat-eip-${count.index + 1}"
    }
  )
  
  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways for private subnets to access internet
resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? local.nat_gateway_count : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-nat-gateway-${count.index + 1}"
    }
  )
  
  depends_on = [aws_internet_gateway.main]
}

#---------------------------------------
# Route Tables & Associations
#---------------------------------------
# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-public-route-table"
      Tier = "Public"
    }
  )
}

# Public route to internet gateway
resource "aws_route" "public_internet_gateway" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

# Private route tables
resource "aws_route_table" "private" {
  count  = local.nat_gateway_count > 0 ? local.nat_gateway_count : 1
  vpc_id = aws_vpc.main.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-private-route-table-${count.index + 1}"
      Tier = "Private"
    }
  )
}

# Private routes to NAT Gateways
resource "aws_route" "private_nat_gateway" {
  count                  = local.nat_gateway_count
  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[count.index % local.nat_gateway_count].id
}

# Public subnet associations
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private app subnet associations
resource "aws_route_table_association" "private_app" {
  count          = length(aws_subnet.private_app)
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = local.nat_gateway_count > 0 ? aws_route_table.private[var.single_nat_gateway ? 0 : count.index % local.nat_gateway_count].id : aws_route_table.private[0].id
}

# Private data subnet associations
resource "aws_route_table_association" "private_data" {
  count          = length(aws_subnet.private_data)
  subnet_id      = aws_subnet.private_data[count.index].id
  route_table_id = local.nat_gateway_count > 0 ? aws_route_table.private[var.single_nat_gateway ? 0 : count.index % local.nat_gateway_count].id : aws_route_table.private[0].id
}

#---------------------------------------
# Security Groups
#---------------------------------------
# Security group for application load balancer
resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Security group for application load balancer"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    description = "HTTP from internet (for redirects)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    description = "Outbound traffic to VPC only"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-alb-sg"
    }
  )
}

# Security group for application resources
resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-app-sg"
  description = "Security group for application resources"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    description     = "HTTPS from ALB"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  
  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  
  ingress {
    description     = "Application port from ALB"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  
  egress {
    description = "Outbound traffic to anywhere"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-app-sg"
    }
  )
}

# Security group for database resources
resource "aws_security_group" "db" {
  name        = "${local.name_prefix}-db-sg"
  description = "Security group for database resources"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    description     = "Database port from app"
    from_port       = var.db_port
    to_port         = var.db_port
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
  
  egress {
    description = "Outbound traffic to VPC only"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-db-sg"
    }
  )
}

#---------------------------------------
# VPC Flow Logs
#---------------------------------------
# VPC Flow Logs for network monitoring and security analysis
resource "aws_flow_log" "main" {
  count                = var.enable_flow_logs ? 1 : 0
  log_destination_type = "cloud-watch-logs"
  log_destination      = aws_cloudwatch_log_group.flow_log[0].arn
  iam_role_arn         = aws_iam_role.vpc_flow_log_role[0].arn
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-vpc-flow-log"
    }
  )
}

# CloudWatch Log Group for VPC Flow Logs
resource "aws_cloudwatch_log_group" "flow_log" {
  count             = var.enable_flow_logs ? 1 : 0
  name              = "/aws/vpc-flow-log/${aws_vpc.main.id}"
  retention_in_days = var.flow_logs_retention_days
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-vpc-flow-log-group"
    }
  )
}

# IAM Role for VPC Flow Logs
resource "aws_iam_role" "vpc_flow_log_role" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${local.name_prefix}-vpc-flow-log-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        },
        Effect = "Allow",
        Sid    = ""
      }
    ]
  })
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-vpc-flow-log-role"
    }
  )
}

# IAM Policy for VPC Flow Logs
resource "aws_iam_role_policy" "vpc_flow_log_policy" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${local.name_prefix}-vpc-flow-log-policy"
  role  = aws_iam_role.vpc_flow_log_role[0].id
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ],
        Effect   = "Allow",
        Resource = "*"
      }
    ]
  })
}

#---------------------------------------
# VPN Gateway (Optional)
#---------------------------------------
# VPN Gateway for on-premises connectivity
resource "aws_vpn_gateway" "main" {
  count  = var.enable_vpn_gateway ? 1 : 0
  vpc_id = aws_vpc.main.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-vpn-gateway"
    }
  )
}

#---------------------------------------
# Database Subnet Group
#---------------------------------------
# DB Subnet Group for RDS or other database services
resource "aws_db_subnet_group" "main" {
  count      = var.create_database_subnet_group ? 1 : 0
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = aws_subnet.private_data.*.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-db-subnet-group"
    }
  )
}

#---------------------------------------
# Default Security Group Restrictions
#---------------------------------------
# Restrict default security group to deny all traffic (security best practice)
resource "aws_default_security_group" "default" {
  count  = var.restrict_default_security_group ? 1 : 0
  vpc_id = aws_vpc.main.id
  
  # No ingress or egress rules - effectively denying all traffic
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-default-sg-restricted"
    }
  )
}

#---------------------------------------
# Variables
#---------------------------------------
variable "name_prefix" {
  description = "Prefix to be used for resource names"
  type        = string
  default     = "refunds"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "owner" {
  description = "Owner of the resources"
  type        = string
  default     = "refunds-team"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_dns_support" {
  description = "Enable DNS support in the VPC"
  type        = bool
  default     = true
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in the VPC"
  type        = bool
  default     = true
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = []
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for the private application subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
}

variable "private_data_subnet_cidrs" {
  description = "CIDR blocks for the private data subnets"
  type        = list(string)
  default     = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for all private subnets"
  type        = bool
  default     = false
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

variable "flow_logs_retention_days" {
  description = "Number of days to retain VPC Flow Logs"
  type        = number
  default     = 30
}

variable "enable_vpn_gateway" {
  description = "Enable VPN Gateway"
  type        = bool
  default     = false
}

variable "create_database_subnet_group" {
  description = "Create a database subnet group"
  type        = bool
  default     = true
}

variable "restrict_default_security_group" {
  description = "Restrict the default security group to deny all traffic"
  type        = bool
  default     = true
}

variable "app_port" {
  description = "Port on which the application listens"
  type        = number
  default     = 8080
}

variable "db_port" {
  description = "Port on which the database listens"
  type        = number
  default     = 27017  # Default MongoDB port
}

#---------------------------------------
# Outputs
#---------------------------------------
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the created VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the created public subnets"
  value       = aws_subnet.public.*.id
}

output "private_app_subnet_ids" {
  description = "IDs of the created private application subnets"
  value       = aws_subnet.private_app.*.id
}

output "private_data_subnet_ids" {
  description = "IDs of the created private data subnets"
  value       = aws_subnet.private_data.*.id
}

output "public_subnet_cidr_blocks" {
  description = "CIDR blocks of the created public subnets"
  value       = aws_subnet.public.*.cidr_block
}

output "private_app_subnet_cidr_blocks" {
  description = "CIDR blocks of the created private application subnets"
  value       = aws_subnet.private_app.*.cidr_block
}

output "private_data_subnet_cidr_blocks" {
  description = "CIDR blocks of the created private data subnets"
  value       = aws_subnet.private_data.*.cidr_block
}

output "nat_gateway_ids" {
  description = "IDs of the created NAT Gateways"
  value       = aws_nat_gateway.main.*.id
}

output "internet_gateway_id" {
  description = "ID of the created Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "route_table_public_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "route_table_private_ids" {
  description = "IDs of the private route tables"
  value       = aws_route_table.private.*.id
}

output "app_security_group_id" {
  description = "ID of the application security group"
  value       = aws_security_group.app.id
}

output "db_security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.db.id
}

output "alb_security_group_id" {
  description = "ID of the load balancer security group"
  value       = aws_security_group.alb.id
}

output "db_subnet_group_name" {
  description = "Name of the database subnet group"
  value       = var.create_database_subnet_group ? aws_db_subnet_group.main[0].name : null
}

output "availability_zones" {
  description = "List of availability zones used"
  value       = var.availability_zones
}