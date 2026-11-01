```groovy
pipeline {
    agent any

    tools {
        nodejs 'NodeJS-20'
    }

    environment {
        AWS_REGION = 'ap-southeast-2'
        AWS_ACCOUNT_ID = '297681905096'
        ECR_REPOSITORY = 'e-commers'
        ECR_REGISTRY = '297681905096.dkr.ecr.ap-southeast-2.amazonaws.com'
        S3_BUCKET = 'e-commerce-artifactory'

        SERVICES = 'api-gateway auth-service order-service inventory-service notification-service'
    }

    stages {

        stage('Git Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/Abhish7899/ecommerce-microservices-devops.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    def services = env.SERVICES.split(' ')

                    for (service in services) {
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
                    mkdir -p build-artifacts

                    tar -czf build-artifacts/ecommerce-release-${BUILD_NUMBER}.tar.gz \
                        --exclude='.git' \
                        --exclude='node_modules' \
                        --exclude='.env' \
                        --exclude='.env.*' \
                        --exclude='k8s/secrets' \
                        --exclude='**/node_modules' \
                        api-gateway \
                        auth-service \
                        order-service \
                        inventory-service \
                        notification-service \
                        deploy \
                        k8s \
                        README.md \
                        docker-compose.yml \
                        Jenkinsfile

                    echo "BUILD_NUMBER=${BUILD_NUMBER}" > build-artifacts/build-info.txt
                    echo "GIT_COMMIT=${GIT_COMMIT}" >> build-artifacts/build-info.txt
                    echo "IMAGE_TAG=build-${BUILD_NUMBER}" >> build-artifacts/build-info.txt
                '''

                archiveArtifacts artifacts: 'build-artifacts/*'
            }
        }

        stage('Upload Artifact to S3') {
            steps {
                sh '''
                    aws s3 cp \
                    build-artifacts/ecommerce-release-${BUILD_NUMBER}.tar.gz \
                    s3://${S3_BUCKET}/ecommerce/releases/build-${BUILD_NUMBER}/
                    
                    aws s3 cp \
                    build-artifacts/build-info.txt \
                    s3://${S3_BUCKET}/ecommerce/releases/build-${BUILD_NUMBER}/
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    def services = env.SERVICES.split(' ')

                    for (service in services) {
                        sh """
                            docker build \
                            -t ${ECR_REGISTRY}/${ECR_REPOSITORY}:${service}-build-${BUILD_NUMBER} \
                            ./${service}
                        """
                    }
                }
            }
        }

        stage('Login to AWS ECR') {
            steps {
                sh '''
                    aws ecr get-login-password --region ${AWS_REGION} |
                    docker login \
                    --username AWS \
                    --password-stdin ${ECR_REGISTRY}
                '''
            }
        }

        stage('Push Images to ECR') {
            steps {
                script {
                    def services = env.SERVICES.split(' ')

                    for (service in services) {
                        sh """
                            docker push \
                            ${ECR_REGISTRY}/${ECR_REPOSITORY}:${service}-build-${BUILD_NUMBER}
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "CI Pipeline completed successfully. Build: ${BUILD_NUMBER}"
        }

        failure {
            echo "CI Pipeline failed. Build: ${BUILD_NUMBER}"
        }

        always {
            sh 'docker logout ${ECR_REGISTRY} || true'
        }
    }
}
```

