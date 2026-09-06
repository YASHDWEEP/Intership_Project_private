# 🚀 CabMitra Enterprise - Complete AWS Hosting & CI/CD Deployment Architecture Guide

This comprehensive guide outlines the exact production architecture, AWS requirements, environment variables, GitHub Actions pipeline, and step-by-step setup instructions to host **CabMitra** on **Amazon Web Services (AWS)** with fully automated **CI/CD deployment**.

---

## 🏗️ Production Architecture Overview

```
                        ┌───────────────────────────────────────────────────────────┐
                        │                     AWS CLOUDFRONT                        │
                        │               (Global CDN + HTTPS SSL)                    │
                        └─────────────────────────────┬─────────────────────────────┘
                                                      │
                                                      ▼
                        ┌───────────────────────────────────────────────────────────┐
                        │                      AWS S3 BUCKET                        │
                        │                 (Static React Production)                 │
                        └───────────────────────────────────────────────────────────┘

                                                      │ API Requests (HTTPS)
                                                      ▼
                        ┌───────────────────────────────────────────────────────────┐
                        │             AWS APP RUNNER / ECS FARGATE                  │
                        │                 (Backend Express API)                     │
                        └─────────────────────────────┬─────────────────────────────┘
                                                      │
                                                      ▼
                        ┌───────────────────────────────────────────────────────────┐
                        │               AWS RDS POSTGRESQL / NEON                   │
                        │                 (Managed Database)                        │
                        └───────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites & AWS Service Requirements

### 1. **AWS Infrastructure Components**
| Component | Recommended AWS Service | Description / Free Tier |
| :--- | :--- | :--- |
| **Database** | **AWS RDS (PostgreSQL)** or **Neon DB** | Managed PostgreSQL database (`db.t4g.micro` eligible for Free Tier). |
| **Backend API** | **AWS App Runner** or **AWS ECS (Fargate)** | Auto-scaling containerized Express API. Handles SSL certificates out-of-the-box. |
| **Container Registry** | **AWS ECR (Elastic Container Registry)** | Private repository (`cabmitra-backend`) to store compiled Docker images. |
| **Frontend Static** | **AWS S3** | S3 Bucket hosting the compiled Vite/React static distribution (`dist`). |
| **Frontend CDN** | **AWS CloudFront** | Global Content Delivery Network providing free SSL (`https://yourdomain.com`). |

---

## 🔐 GitHub Repository Secrets Checklist

To activate the automated CI/CD pipeline, add the following secrets in your GitHub Repository under **Settings ➔ Secrets and variables ➔ Actions ➔ New repository secret**:

| Secret Name | Example Value / Description |
| :--- | :--- |
| `AWS_ACCESS_KEY_ID` | `AKIAIOSFODNN7EXAMPLE` (IAM User Access Key) |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | `us-east-1` (or `ap-south-1` for Mumbai) |
| `ECR_BACKEND_REPO_NAME` | `cabmitra-backend` |
| `DATABASE_URL` | `postgresql://user:password@your-rds.amazonaws.com:5432/cabmitra_db?schema=public` |
| `JWT_SECRET` | `your_ultra_secure_production_jwt_secret_key_2026` |
| `PROD_API_BASE_URL` | `https://api.cabmitra.com/api` (App Runner / ECS Backend URL) |
| `AWS_S3_BUCKET_NAME` | `cabmitra-frontend-prod` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E1A2B3C4D5E6F7` (CloudFront Distribution ID) |

---

## ⚙️ Step-by-Step AWS Setup Instructions

### Step 1: Create AWS IAM User for GitHub Actions
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Navigate to **IAM ➔ Users ➔ Create user**.
3. Name: `github-actions-cabmitra`.
4. Attach policies:
   - `AmazonEC2ContainerRegistryPowerUser`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
5. Go to **Security credentials ➔ Create access key** (select **Command Line Interface (CLI)**).
6. Copy `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to GitHub Secrets.

---

### Step 2: Create Amazon ECR Repository
1. Navigate to **Amazon ECR ➔ Repositories ➔ Create repository**.
2. Select **Private**.
3. Name: `cabmitra-backend`.
4. Click **Create repository**.

---

### Step 3: Setup AWS App Runner (Backend API)
1. Navigate to **AWS App Runner ➔ Create service**.
2. Source: **Container registry ➔ Amazon ECR**.
3. Choose repository `cabmitra-backend` and tag `latest`.
4. Deployment trigger: **Automatic**.
5. Environment variables:
   - `PORT`: `5000`
   - `DATABASE_URL`: `postgresql://...`
   - `JWT_SECRET`: `...`
6. Health check path: `/api/health`.
7. Click **Create & Deploy**. App Runner will generate an HTTPS URL (e.g. `https://xxx.us-east-1.awsapprunner.com`).

---

### Step 4: Setup AWS S3 & CloudFront (Frontend)
1. Navigate to **Amazon S3 ➔ Create bucket**.
2. Bucket Name: `cabmitra-frontend-prod`.
3. Uncheck **Block all public access** (or configure CloudFront OAC).
4. Navigate to **AWS CloudFront ➔ Create distribution**.
5. Origin Domain: Select your S3 bucket.
6. Default root object: `index.html`.
7. Custom error responses: Map HTTP 404 & 403 to `/index.html` with HTTP 200 (Required for React Router SPA).

---

## 🔄 Automated CI/CD Pipeline Flow

When you push code to `main` branch, the workflow (`.github/workflows/deploy.yml`) automatically executes 3 parallel stages:

1. **Stage 1 (Test & Verify)**: Checks TypeScript (`npx tsc --noEmit`) and runs automated backend unit tests.
2. **Stage 2 (Backend Build & Deploy)**: Compiles backend container image, pushes to AWS ECR, runs Prisma migrations on AWS RDS/Neon, and triggers App Runner deployment.
3. **Stage 3 (Frontend Build & Deploy)**: Compiles static React bundle, syncs dist files to S3, and invalidates CloudFront CDN cache.

---

## 🛠️ Local Command to Trigger First Deployment

```bash
git add .
git commit -m "feat: Add production AWS Docker configurations and GitHub Actions CI/CD pipeline"
git push origin main
```
