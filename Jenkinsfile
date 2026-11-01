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

        ECR_REPOSITORY = 'e-commers'
        ECR_REGISTRY = '297681905096.dkr.ecr.ap-southeast-2.amazonaws.com'

        S3_BUCKET = 'e-commerce-artifactory'

        IMAGE_TAG = "build-${BUILD_NUMBER}"
    }

    stages {

        // --------------------------------
        // 1. GIT CHECKOUT
        // --------------------------------

        stage('Git Checkout') {
            steps {
                checkout scm

                sh '''
                    echo "Checking Git branch"
                    git branch --show-current

                    echo "Checking latest commit"
                    git log -1 --oneline
                '''
            }
        }


        // --------------------------------
        // 2. VERIFY ENVIRONMENT
        // --------------------------------

        stage('Verify Environment') {
            steps {
                sh '''
                    echo "Node Version:"
                    node --version

                    echo "NPM Version:"
                    npm --version

                    echo "Docker Version:"
                    docker --version

                    echo "AWS CLI Version:"
                    aws --version

                    echo "AWS Identity:"
                    aws sts get-caller-identity
                '''
            }
        }


        // --------------------------------
        // 3. INSTALL DEPENDENCIES
        // --------------------------------

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

                        echo "Installing dependencies for ${service}"

                        dir(service) {

                            sh '''
                                npm install --no-audit --no-fund
                            '''
                        }
                    }
                }
            }
        }


        // --------------------------------
        // 4. RUN TESTS
        // --------------------------------

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

                        echo "Running tests for ${service}"

                        dir(service) {

                            def testStatus = sh(
                                script: 'npm test -- --passWithNoTests',
                                returnStatus: true
                            )

                            if (testStatus != 0) {

                                failedServices.add(service)

                                echo "WARNING: Tests failed for ${service}"

                            } else {

                                echo "SUCCESS: Tests passed for ${service}"
                            }
                        }
                    }

                    if (failedServices.size() > 0) {

                        env.TEST_STATUS = 'FAILED'

                        currentBuild.description =
                            "Test failures: ${failedServices.join(', ')}"

                        echo "WARNING: Some tests failed."
                        echo "Failed services: ${failedServices.join(', ')}"
                        echo "Continuing pipeline temporarily."

                    } else {

                        env.TEST_STATUS = 'PASSED'

                        echo "All microservice tests passed."
                    }
                }
            }
        }


        // --------------------------------
        // 5. CREATE ARTIFACT
        // --------------------------------

        stage('Create Artifact') {
            steps {
                sh '''
                    set -e

                    ARTIFACT_NAME="ecommerce-${BUILD_NUMBER}.tar.gz"

                    echo "Creating build information"

                    cat > build-info.txt <<EOF
Build Number: ${BUILD_NUMBER}
Git Commit: $(git rev-parse HEAD)
Build Date: $(date -u)
Branch: $(git branch --show-current)
Test Status: ${TEST_STATUS}
EOF

                    echo "Preparing artifact paths"

                    ARTIFACT_PATHS=()

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
                            ARTIFACT_PATHS+=("$path")
                        fi
                    done

                    echo "Creating compressed artifact"

                    tar -czf "$ARTIFACT_NAME" \
                        --exclude='.git' \
                        --exclude='*/node_modules' \
                        --exclude='*/.env' \
                        --exclude='*/.env.*' \
                        --exclude='*/coverage' \
                        --exclude='*/k8s/secrets' \
                        --exclude='k8s/secrets' \
                        --exclude='ecommerce-images.tar' \
                        "${ARTIFACT_PATHS[@]}"

                    echo "Artifact created:"
                    ls -lh "$ARTIFACT_NAME"
                '''

                archiveArtifacts artifacts: 'ecommerce-*.tar.gz, build-info.txt',
                                 fingerprint: true
            }
        }


        // --------------------------------
        // 6. UPLOAD ARTIFACT TO S3
        // --------------------------------

        stage('Upload Artifact to S3') {
            steps {
                sh '''
                    set -e

                    ARTIFACT_NAME="ecommerce-${BUILD_NUMBER}.tar.gz"

                    S3_PATH="s3://${S3_BUCKET}/ecommerce/releases/build-${BUILD_NUMBER}/"

                    echo "Uploading artifact to S3"

                    aws s3 cp "$ARTIFACT_NAME" "$S3_PATH"

                    aws s3 cp build-info.txt "$S3_PATH"

                    echo "S3 upload completed"

                    aws s3 ls "$S3_PATH"
                '''
            }
        }


        // --------------------------------
        // 7. ECR LOGIN
        // --------------------------------

        stage('ECR Login') {
            steps {
                sh '''
                    set -e

                    echo "Logging in to Amazon ECR"

                    aws ecr get-login-password \
                        --region "$AWS_REGION" \
                    | docker login \
                        --username AWS \
                        --password-stdin "$ECR_REGISTRY"

                    echo "ECR login successful"
                '''
            }
        }


        // --------------------------------
        // 8. BUILD DOCKER IMAGES
        // --------------------------------

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

                        echo "Building Docker image for ${service}"

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


        // --------------------------------
        // 9. PUSH DOCKER IMAGES TO ECR
        // --------------------------------

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

                        echo "Pushing ${service} image to ECR"

                        sh """
                            docker push \
                                ${ECR_REGISTRY}/${ECR_REPOSITORY}:${service}-build-${BUILD_NUMBER}
                        """
                    }
                }
            }
        }


        // --------------------------------
        // 10. VERIFY ECR IMAGES
        // --------------------------------

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

                        echo "Verifying ${service} image"

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


    // --------------------------------
    // POST BUILD ACTIONS
    // --------------------------------

    post {

        success {
            echo 'CI Pipeline completed successfully.'
            echo 'Artifact uploaded to S3.'
            echo 'Docker images pushed to ECR.'
            echo "Test status: ${env.TEST_STATUS}"
        }

        failure {
            echo 'CI Pipeline failed. Check the Jenkins console output.'
        }

        always {
            sh '''
                docker logout "$ECR_REGISTRY" || true
            '''

            echo 'Pipeline execution finished.'
        }
    }
}
