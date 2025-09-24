
## Build
- docker build . --no-cache -t registry.gitlab.com/monitoring:latest
- docker build ./src/frontend --no-cache -t registry.gitlab.com/monitoring-frontend:latest
- docker run -e PROFILE=docker -t registry.gitlab.com/monitoring:latest
  docker stack rm monitoring_stack
- docker stack deploy -c docker-compose.yml mystack
- 
docker service ps mystack_phpmyadmin

docker service ps monitoring_stack_monitoring-backend
docker pull ghcr.io/proteus1121/monitoring-backend:latest


docker logs $(docker ps -q --filter name=monitoring_stack_monitoring-backend)

docker stack services monitoring_stack




# VPS Setup Guide

This guide walks you through setting up a new VPS instance for Docker workloads, including Docker installation, initializing Docker Swarm, creating swap space, and moving Docker data to an extra disk for more storage.

---

## 1. Install Docker

Follow instructions from the official Docker documentation:
https://docs.docker.com/engine/install/ubuntu/

### Add Docker's official GPG key:
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

### Add the Docker repository:
```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

### Install Docker packages:
```bash
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

## 2. Initialize Docker Swarm
```bash
sudo docker swarm init --advertise-addr 139.59.148.159
```

---

## 3. Create Swap Space
If your VPS has low RAM, adding swap helps prevent out-of-memory errors. I set 1G but 512M should be also fine.
```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile    
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 4. Move Docker Data to a New Disk
If your root partition is small, move Docker’s storage to a larger, attached volume (e.g., `/mnt/volume_fra1_01`).

### Stop Docker:
```bash
sudo systemctl stop docker
```

### Move Docker Data:
```bash
sudo mv /var/lib/docker /mnt/volume_fra1_02/docker
```

### Create a Symlink:
```bash
sudo ln -s /mnt/volume_fra1_02/docker /var/lib/docker
```

### Start Docker:
```bash
sudo systemctl start docker
```

### Verify Docker Storage:
```bash
docker info | grep "Docker Root Dir"
```

---

## Notes
- All Docker images, containers, and volumes will now use the extra disk, freeing up space on your root partition.
- Ensure the extra volume is mounted automatically by adding it to `/etc/fstab` if needed.
- Adjust swap size as needed for your workload.
