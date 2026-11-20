def SERVICES = [
    'api-gateway',
    'auth-service',
    'order-service',
    'inventory-service',
    'notification-service'
]

pipeline {
    agent {
        label 'ephemeral-ec2'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
        timeout(time: 30, unit: 'MINUTES')
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
                        echo "Running tests: ${service}"
                        dir(service) {
                            def status = sh(
                                script: 'npm test -- --passWithNoTests',
                                returnStatus: true
                            )
                            if (status != 0) {
                                failedServices.add(service)
                                echo "FAILED: ${service} tests failed!"
                            } else {
                                echo "PASSED: ${service} tests passed."
                            }
                        }
                    }

                    if (failedServices.size() > 0) {
                        currentBuild.description = "Tests failed: ${failedServices.join(', ')}"
                        error("Pipeline aborted! Unit tests failed in: ${failedServices.join(', ')}")
                    }
                }
            }
        }

        stage('Security Scan (Filesystem & Secrets)') {
            steps {
                sh '''#!/bin/bash
                    set -euo pipefail
                    if command -v trivy >/dev/null 2>&1; then
                        trivy fs --scanners vuln,secret --severity CRITICAL --exit-code 1 .
                    else
                        echo "Skipping Trivy scan (install trivy in EC2 Init Script for DevSecOps)"
                    fi
                '''
            }
        }

        stage('Package & Upload Artifact to S3') {
            steps {
                sh '''#!/bin/bash
                    set -euo pipefail
                    ARTIFACT_NAME="ecommerce-${BUILD_NUMBER}-${GIT_SHORT_SHA}.tar.gz"
                    S3_PATH="s3://${S3_BUCKET}/ecommerce/releases/build-${BUILD_NUMBER}-${GIT_SHORT_SHA}/"

                    cat > build-info.txt <<EOF
Build Number: ${BUILD_NUMBER}
Git Commit: ${GIT_FULL_SHA}
Build Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Branch: ${BUILD_BRANCH}
Image Suffix: ${IMAGE_SUFFIX}
Test Status: PASSED
EOF

                    set --
                    for path in api-gateway auth-service order-service inventory-service notification-service k8s deploy README.md docker-compose.yml Jenkinsfile build-info.txt; do
                        [ -e "$path" ] && set -- "$@" "$path"
                    done

                    tar -czf "$ARTIFACT_NAME" \
                        --exclude='.git' --exclude='*/.git' \
                        --exclude='node_modules' --exclude='*/node_modules' \
                        --exclude='.env*' --exclude='*/.env*' \
                        --exclude='coverage' --exclude='*/coverage' \
                        --exclude='secrets' --exclude='*/secrets' \
                        -- "$@"

                    test -s "$ARTIFACT_NAME"

                    aws s3 cp "$ARTIFACT_NAME" "$S3_PATH" --sse AES256
                    aws s3 cp build-info.txt "$S3_PATH" --sse AES256
                    aws s3 ls "$S3_PATH"
                '''

                archiveArtifacts(artifacts: 'build-info.txt', fingerprint: true)
            }
        }

        stage('Build, Scan & Push Docker Images') {
            steps {
                sh '''#!/bin/bash
                    set -euo pipefail
                    aws ecr get-login-password --region "${AWS_REGION}" \
                    | docker login --username AWS --password-stdin "${ECR_REGISTRY}"
                '''

                script {
                    for (service in SERVICES) {
                        def imageTag = "${ECR_REGISTRY}/${ECR_REPOSITORY}:${service}-${env.IMAGE_SUFFIX}"
                        echo "Building & Pushing: ${imageTag}"

                        sh """#!/bin/bash
                            set -euo pipefail
                            docker build -t "${imageTag}" "./${service}"

                            if command -v trivy >/dev/null 2>&1; then
                                trivy image --severity CRITICAL --ignore-unfixed --exit-code 0 "${imageTag}"
                            fi

                            docker push "${imageTag}"

                            aws ecr describe-images \
                                --repository-name "${ECR_REPOSITORY}" \
                                --region "${AWS_REGION}" \
                                --image-ids imageTag="${service}-${env.IMAGE_SUFFIX}" > /dev/null
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "CI Pipeline PASSED | Release: ${env.IMAGE_SUFFIX}"
        }
        failure {
            echo "CI Pipeline FAILED | Check console logs. Ephemeral agent will auto-terminate."
        }
        always {
            sh '''#!/bin/bash
                docker logout "${ECR_REGISTRY}" || true
                docker system prune -af --volumes || true
            '''
            cleanWs()
        }
    }
}
