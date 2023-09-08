

pipeline {
    agent any

    
    environment {
        DOCKER_IMAGE = 'registry.cn-hangzhou.aliyuncs.com/leansd/auth:latest'
    }

   
    triggers {
        pollSCM('H/10 * * * *')  // 每10分钟轮询一次
    }

    stages {
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: 'main']],
                    doGenerateSubmoduleConfigurations: false,
                    extensions: [],
                    submoduleCfg: [],
                    userRemoteConfigs: [[
                        credentialsId: 'git',
                        url: 'git@gitee.com:leansd/auth.git'
                    ]]
                ])
            }
        }

        stage('Unit Test') {
            steps {
                sh 'npm install'
                sh 'npm run test'
            }
        }

    stage('Docker Build & Push') {
            when {
                expression { currentBuild.resultIsBetterOrEqualTo('SUCCESS') }
            }
            steps {
                script {
                    docker.build("${DOCKER_IMAGE}")
                    docker.withRegistry('https://registry.cn-hangzhou.aliyuncs.com/emergentdesign/leansd', 'aliyun-docker-registry-credentials') {
                        docker.image("${DOCKER_IMAGE}").push()
                    }
                }
            }
        }
        
    }
}