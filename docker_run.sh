docker run --name auth -p:8848:8848 --env=KEYCLOAK_BASE_URL=http://host.docker.internal:8089 -d leansd/auth:latest

