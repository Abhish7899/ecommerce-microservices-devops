pipeline {
    agent any

    tools {
        nodejs 'NodeJS-20'
    }

    environment {
        AWS_REGION     = 'ap-southeast-2'
        ECR_REPOSITORY = 'e-commers'
        ECR_REGISTRY   = '297681905096.dkr.ecr.ap-southeast-2.amazonaws.com'
        S3_BUCKET      = 'e-commerce-artifactory'

        SERVICES = 'api-gateway auth-service order-service inventory-service notification-service'
        IMAGE_TAG = "build-${BUILD_NUMBER}"
    }

    stages {

        stage('Git Checkout') {
            steps {
                echo 'Checking out source code from GitHub'
                checkout scm
            }
        }

        stage('Verify Environment') {
            steps {
                sh '''
                    echo "Node version:"
                    node --version

                    echo "NPM version:"
                    npm --version

                    echo "Docker version:"
                    docker --version

                    echo "AWS identity:"
                    aws sts get-caller-identity
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    def services = env.SERVICES.split(' ')

                    for (service in services) {
                        echo "Installing dependencies: ${service}"

                        dir(service) {
                            sh 'npm install'
                        }
                    }
                }
            }
        }

        stage('Run Tests') {
            steps {
                script {
                    def services = env.SERVICES.split(' ')

                    for (service in services) {
                        echo "Running tests: ${service}"

                        dir(service) {
                            sh 'npm test -- --passWithNoTests'
                        }
                    }
                }
            }
        }

        stage('Create Build Artifact') {
            steps {
                sh '''
                    set -eu

                    mkdir -p build-artifacts

                    tar -czf build-artifacts/ecommerce-release-${BUILD_NUMBER}.tar.gz \
                        --exclude='.git' \
                        --exclude='node_modules' \
                        --exclude='**/node_modules' \
                        --exclude='.env' \
                        --exclude='.env.*' \
                        --exclude='**/.env' \
                        --exclude='**/.env.*' \
                        --exclude='k8s/secrets' \
                        --exclude='**/coverage' \
                        api-gateway \
                        auth-service \
                        order-service \
                        inventory-service \
                        notification-service \
                        k8s \
                        README.md \
                        docker-compose.yml \
                        Jenkinsfile

                    printf 'BUILD_NUMBER=%s\\nGIT_COMMIT=%s\\nIMAGE_TAG=%s\\nBUILD_DATE=%s\\n' \
                        "$BUILD_NUMBER" \
                        "$GIT_COMMIT" \
                        "$IMAGE_TAG" \
                        "$(date -u)" \
                        > build-artifacts/build-info.txt

                    echo "Generated artifacts:"
                    ls -lh build-artifacts/
                '''

                archiveArtifacts artifacts: 'build-artifacts/*',
                    fingerprint: true
            }
        }

        stage('Upload Artifact to S3') {
            steps {
                sh '''
                    set -eu

                    aws s3 cp \
                        build-artifacts/ecommerce-release-${BUILD_NUMBER}.tar.gz \
                        s3://${S3_BUCKET}/ecommerce/releases/build-${BUILD_NUMBER}/

                    aws s3 cp \
                        build-artifacts/build-info.txt \
                        s3://${S3_BUCKET}/ecommerce/releases/build-${BUILD_NUMBER}/
                '''

                echo "Artifact uploaded to S3 successfully"
            }
        }

        stage('ECR Login') {
            steps {
                sh '''
                    set -eu

                    aws ecr get-login-password \
                        --region ${AWS_REGION} |
                    docker login \
                        --username AWS \
                        --password-stdin ${ECR_REGISTRY}
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    def services = env.SERVICES.split(' ')

                    for (service in services) {
                        echo "Building Docker image: ${service}"

                        sh """
                            docker build \
                                -t ${ECR_REGISTRY}/${ECR_REPOSITORY}:${service}-${IMAGE_TAG} \
                                ./${service}
                        """
                    }
                }
            }
        }

        stage('Push Images to ECR') {
            steps {
                script {
                    def services = env.SERVICES.split(' ')

                    for (service in services) {
                        echo "Pushing Docker image: ${service}"

                        sh """
                            docker push \
                                ${ECR_REGISTRY}/${ECR_REPOSITORY}:${service}-${IMAGE_TAG}
                        """
                    }
                }
            }
        }

        stage('Verify ECR Images') {
            steps {
                script {
                    def services = env.SERVICES.split(' ')

                    for (service in services) {
                        echo "Verifying ECR image: ${service}"

                        sh """
                            aws ecr describe-images \
                                --repository-name ${ECR_REPOSITORY} \
                                --image-ids imageTag=${service}-${IMAGE_TAG} \
                                --region ${AWS_REGION}
                        """
                    }
                }
            }
        }
    }

    post {

        success {
            echo """
            ==========================================
                  E-COMMERCE CI PIPELINE SUCCESS
            ==========================================
            Build Number : ${BUILD_NUMBER}
            Image Tag    : ${IMAGE_TAG}
            S3 Bucket    : ${S3_BUCKET}
            ECR Repo     : ${ECR_REPOSITORY}
            ==========================================
            """
        }

        failure {
            echo """
            ==========================================
                  E-COMMERCE CI PIPELINE FAILED
            ==========================================
            Build Number : ${BUILD_NUMBER}
            Check Jenkins Console Output.
            ==========================================
            """
        }

        always {
            sh 'docker logout "$ECR_REGISTRY" || true'
            echo 'Pipeline execution completed'
        }
    }
}


