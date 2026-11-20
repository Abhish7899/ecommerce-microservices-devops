// DRY principle: Services list ek hi jagah define karo
def SERVICES = [
    'api-gateway',
    'auth-service',
    'order-service',
    'inventory-service',
    'notification-service'
]

pipeline {
    // Force ephemeral EC2 agent (Controller pe kabhi build nahi chalega)
    agent {
        label 'ephemeral-ec2'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
        // Cost safety: Agar build hang ho jaye toh 30 min mein kill ho jaye
        timeout(time: 30, unit: 'MINUTES')
        // Controller disk safety: Sirf last 20 builds ke logs rakho
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        AWS_REGION     = 'ap-southeast-2'
        AWS_ACCOUNT_ID = '297681905096'
        ECR_REPOSITORY = 'e-commers'
        ECR_REGISTRY   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        S3_BUCKET      = 'e-commerce-artifactory'
    }

    stages {

        stage('Git Checkout & Metadata') {
            steps {
                checkout scm
                script {
                    // Detached HEAD fix: Git SHA aur Branch safely capture karo
                    env.GIT_SHORT_SHA = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.GIT_FULL_SHA  = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.BUILD_BRANCH  = env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'unknown'
                    env.IMAGE_SUFFIX  = "build-${BUILD_NUMBER}-${env.GIT_SHORT_SHA}"
                }
                sh '''#!/bin/bash
                    set -euo pipefail
                    echo "========== GIT METADATA =========="
                    echo "Branch: ${BUILD_BRANCH}"
                    echo "Commit: ${GIT_FULL_SHA}"
                    git log -1 --oneline
                '''
            }
        }

        stage('Verify Ephemeral Agent') {
            steps {
                sh '''#!/bin/bash
                    set -euo pipefail
                    echo "========== ENVIRONMENT CHECK =========="
                    node --version
                    npm --version
                    docker --version
                    aws --version
                    trivy --version || echo "WARNING: Trivy not installed on agent"
                    # Verify IAM Instance Profile (Zero static credentials check)
                    aws sts get-caller-identity
                '''
            }
        }

        stage('Install Dependencies (Clean)') {
            steps {
                script {
                    for (service in SERVICES) {
                        echo "Installing clean dependencies: ${service}"
                        dir(service) {
                            sh '''#!/bin/bash
                                set -euo pipefail
                                if [ -f package-lock.json ]; then
                                    npm ci --no-audit --no-fund
                                else
                                    echo "WARNING: package-lock.json missing! Commit it to Git."
                                    npm install --no-audit --no-fund
                                fi
                            '''
                        }
                    }
                }
            }
        }

        stage('Run Tests (Fail-Fast)') {
            steps {
                script {
                    def failedServices = []
                    for (service in SERVICES) {
