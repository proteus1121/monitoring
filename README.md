
## Build
- docker build . --no-cache -t registry.gitlab.com/monitoring:latest
- docker run -e PROFILE=docker -t registry.gitlab.com/monitoring:latest