pipeline {

    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
    }

    tools {
        nodejs 'NodeJS-20'
    }

    environment {
        AWS_REGION = 'ap-southeast-2'

        AWS_ACCOUNT_ID = '297681905096'

        ECR_REPOSITORY = 'e-commers'

        ECR_REGISTRY = '297681905096.dkr.ecr.ap-southeast-2.amazonaws.com'

        S3_BUCKET = 'e-commerce-artifactory'

        TEST_STATUS = 'NOT_RUN'
    }

    stages {

        // =====================================
        // 1. GIT CHECKOUT
        // =====================================

        stage('Git Checkout') {
            steps {
                checkout scm

                sh '''
                    echo "========== GIT CHECKOUT =========="

                    git branch --show-current

                    git log -1 --oneline

                    echo "Source code checkout completed"
                '''
            }
        }


        // =====================================
        // 2. VERIFY ENVIRONMENT
        // =====================================

        stage('Verify Environment') {
            steps {
                sh '''
                    set -e

                    echo "========== ENVIRONMENT CHECK =========="

                    echo "Node.js:"
                    node --version

                    echo "NPM:"
                    npm --version

                    echo "Docker:"
                    docker --version

                    echo "AWS CLI:"
                    aws --version

                    echo "AWS Identity:"
                    aws sts get-caller-identity

                    echo "Environment verification completed"
                '''
            }
        }


        // =====================================
        // 3. INSTALL DEPENDENCIES
        // =====================================

        stage('Install Dependencies') {
            steps {
                script {

                    def services = [
                        'api-gateway',
                        'auth-service',
                        'order-service',
                        'inventory-service',
                        'notification-service'
                    ]

                    for (service in services) {

                        echo "Installing dependencies: ${service}"

                        dir(service) {

                            sh '''
                                set -e

                                npm install --no-audit --no-fund
                            '''
                        }
                    }
                }
            }
        }


        // =====================================
        // 4. RUN TESTS
        // =====================================

        stage('Run Tests') {
            steps {
                script {

                    def services = [
                        'api-gateway',
                        'auth-service',
                        'order-service',
                        'inventory-service',
                        'notification-service'
                    ]

                    def failedServices = []

                    for (service in services) {

                        echo "Running tests: ${service}"

                        dir(service) {

                            def status = sh(
                                script: 'npm test -- --passWithNoTests',
                                returnStatus: true
                            )

                            if (status != 0) {

                                failedServices.add(service)

                                echo "WARNING: ${service} tests failed"

                            } else {

                                echo "SUCCESS: ${service} tests passed"
                            }
                        }
                    }

                    if (failedServices.size() > 0) {

                        env.TEST_STATUS = 'FAILED'

                        currentBuild.description =
                            "Test failures: ${failedServices.join(', ')}"

                        echo "Failed services: ${failedServices.join(', ')}"

                        echo "Continuing pipeline temporarily."

                    } else {

                        env.TEST_STATUS = 'PASSED'

                        echo "All service tests passed."
                    }
                }
            }
        }


        // =====================================
        // 5. CREATE ARTIFACT
        // =====================================

        stage('Create Artifact') {
            steps {
                sh '''
                    set -eu

                    echo "========== CREATE ARTIFACT =========="

                    ARTIFACT_NAME="ecommerce-${BUILD_NUMBER}.tar.gz"

                    echo "Creating build information"

                    cat > build-info.txt <<EOF
Build Number: ${BUILD_NUMBER}
Git Commit: $(git rev-parse HEAD)
Build Date: $(date -u)
Branch: $(git branch --show-current)
Test Status: ${TEST_STATUS}
EOF

                    echo "Collecting project files"

                    set --

                    for path in \
                        api-gateway \
                        auth-service \
                        order-service \
                        inventory-service \
                        notification-service \
                        k8s \
                        deploy \
                        README.md \
                        docker-compose.yml \
                        Jenkinsfile \
                        build-info.txt
                    do
                        if [ -e "$path" ]; then
                            set -- "$@" "$path"
                        fi
                    done

                    echo "Creating compressed artifact"

                    tar -czf "$ARTIFACT_NAME" \
                        --exclude='.git' \
                        --exclude='*/.git' \
                        --exclude='node_modules' \
                        --exclude='*/node_modules' \
                        --exclude='*/node_modules/*' \
                        --exclude='.env*' \
                        --exclude='*/.env*' \
                        --exclude='coverage' \
                        --exclude='*/coverage' \
                        --exclude='secrets' \
                        --exclude='secrets/*' \
                        --exclude='*/secrets' \
                        --exclude='*/secrets/*' \
                        --exclude='ecommerce-images.tar' \
                        -- "$@"

                    echo "Checking artifact"

                    test -s "$ARTIFACT_NAME"

                    echo "Artifact created successfully"

                    ls -lh "$ARTIFACT_NAME"

                    echo "Artifact contents:"

                    tar -tzf "$ARTIFACT_NAME" | head -40
                '''

                archiveArtifacts(
                    artifacts: 'ecommerce-*.tar.gz,build-info.txt',
                    fingerprint: true
                )
            }
        }


        // =====================================
        // 6. UPLOAD ARTIFACT TO S3
        // =====================================

        stage('Upload Artifact to S3') {
            steps {
                sh '''
                    set -eu

                    echo "========== S3 ARTIFACT UPLOAD =========="

                    ARTIFACT_NAME="ecommerce-${BUILD_NUMBER}.tar.gz"

                    S3_PATH="s3://${S3_BUCKET}/ecommerce/releases/build-${BUILD_NUMBER}/"

                    echo "Uploading artifact"

                    aws s3 cp "$ARTIFACT_NAME" "$S3_PATH"

                    echo "Uploading build information"

                    aws s3 cp build-info.txt "$S3_PATH"

                    echo "Verifying S3 upload"

                    aws s3 ls "$S3_PATH"

                    echo "S3 upload completed successfully"
                '''
            }
        }


        // =====================================
        // 7. ECR LOGIN
        // =====================================

        stage('ECR Login') {
            steps {
                sh '''
                    set -eu

                    echo "========== ECR LOGIN =========="

                    aws ecr get-login-password \
                        --region "$AWS_REGION" \
                    | docker login \
                        --username AWS \
                        --password-stdin "$ECR_REGISTRY"

                    echo "ECR login successful"
                '''
            }
        }


        // =====================================
        // 8. BUILD DOCKER IMAGES
        // =====================================

        stage('Build Docker Images') {
            steps {
                script {

                    def services = [
                        'api-gateway',
                        'auth-service',
                        'order-service',
                        'inventory-service',
                        'notification-service'
                    ]

                    for (service in services) {

                        echo "Building Docker image: ${service}"

                        sh """
                            set -e

                            docker build \
                                -t ${ECR_REGISTRY}/${ECR_REPOSITORY}:${service}-build-${BUILD_NUMBER} \
                                ./${service}
                        """
                    }
                }
            }
        }


        // =====================================
        // 9. PUSH DOCKER IMAGES
        // =====================================

        stage('Push Docker Images') {
            steps {
                script {

                    def services = [
                        'api-gateway',
                        'auth-service',
                        'order-service',
                        'inventory-service',
                        'notification-service'
                    ]

                    for (service in services) {

                        echo "Pushing Docker image: ${service}"

                        sh """
                            set -e

                            docker push \
                                ${ECR_REGISTRY}/${ECR_REPOSITORY}:${service}-build-${BUILD_NUMBER}
                        """
                    }
                }
            }
        }


        // =====================================
        // 10. VERIFY ECR IMAGES
        // =====================================

        stage('Verify ECR Images') {
            steps {
                script {

                    def services = [
                        'api-gateway',
                        'auth-service',
                        'order-service',
                        'inventory-service',
                        'notification-service'
                    ]

                    for (service in services) {

                        echo "Verifying ECR image: ${service}"

                        sh """
                            aws ecr describe-images \
                                --repository-name ${ECR_REPOSITORY} \
                                --region ${AWS_REGION} \
                                --image-ids imageTag=${service}-build-${BUILD_NUMBER}
                        """
                    }
                }
            }
        }
    }


    // =====================================
    // POST BUILD ACTIONS
    // =====================================

    post {

        success {
            echo "CI Pipeline completed successfully."

            echo "Test Status: ${env.TEST_STATUS}"

            echo "Artifact uploaded to S3."

            echo "Docker images pushed to ECR."
        }

        failure {
            echo "CI Pipeline failed."

            echo "Check Jenkins console output."
        }

        always {

            sh '''
                docker logout "$ECR_REGISTRY" || true
            '''

            echo "Pipeline execution completed."
        }
    }
}
