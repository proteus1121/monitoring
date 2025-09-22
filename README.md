
## Build
- docker build . --no-cache -t registry.gitlab.com/monitoring:latest
- docker build ./src/frontend --no-cache -t registry.gitlab.com/monitoring-frontend:latest
- docker run -e PROFILE=docker -t registry.gitlab.com/monitoring:latest
  docker stack rm mystack
