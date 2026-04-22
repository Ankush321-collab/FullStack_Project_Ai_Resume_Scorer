# MER2 Deployment Guide (EC2 + Nginx + PM2 + Docker)

This guide deploys the project on a single Ubuntu EC2 instance.

- Frontend is served by Nginx
- Backend and workers run with PM2
- MongoDB, Redis, Kafka, ClickHouse run with Docker Compose

## 1. EC2 Security Group

Allow inbound:

1. SSH: 22 (from your IP)
2. HTTP: 80 (from anywhere)
3. HTTPS: 443 (optional, recommended later)

## 2. Connect to EC2

    ssh -i your-key.pem ubuntu@40.192.28.131

## 3. Install System Dependencies

    sudo apt update
    sudo apt install -y nginx docker.io docker-compose-plugin git curl
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    sudo npm install -g pm2
    sudo systemctl enable docker
    sudo systemctl start docker

## 4. Clone Project

    sudo mkdir -p /var/www
    cd /var/www
    sudo git clone <YOUR_REPO_URL> mer2
    sudo chown -R ubuntu:ubuntu /var/www/mer2
    cd /var/www/mer2

## 5. Install Node Dependencies

    npm install
    cd backend && npm install && cd ..
    cd frontend && npm install && cd ..
    cd services/parser && npm install && cd ../..
    cd services/embedder && npm install && cd ../..
    cd services/skill-extractor && npm install && cd ../..
    cd services/matcher && npm install && cd ../..
    cd services/feedback && npm install && cd ../..

## 6. Configure Environment

Create and edit:

- /var/www/mer2/backend/.env

Minimum values for same-EC2 deployment:

API_PORT=4000
CORS_ORIGINS=http://40.192.28.131
DATABASE_URL=mongodb://localhost:27017/resume-analyser
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
NEBIUS_API_KEY="v1.CmMKHHN0YXRpY2tleS1lMDBicDVxMzlhYXI1NWQyMzUSIXNlcnZpY2VhY2NvdW50LWUwMGdoODhtaHJobWNzZGE2MjIMCKms-s0GEOPDrYYBOgsIpq-SmQcQwPXJJ0ACWgNlMDA.AAAAAAAAAAFdkuhd0caXopgaQO3yBdQr86qWvmdThG0LLCRp_mVOpZc9e_vLou32gfKWRl6RIKECDeoojc8X5TQraBla8nAB"
NEBIUS_BASE_URL="https://api.tokenfactory.nebius.com/v1/"
NEBIUS_EMBED_MODEL="Qwen/Qwen3-Embedding-8B"
NEBIUS_LLM_MODEL="meta-llama/Llama-3.3-70B-Instruct"

Notes:

- Use localhost for Redis/Kafka if infra runs on the same EC2 host.
- Use cloud endpoints only if you migrate to managed Redis/Kafka.

## 7. Start Infra Containers

From /var/www/mer2:

    docker compose up -d
    docker ps

## 8. Build Applications

    cd /var/www/mer2/backend && npm run build
    cd /var/www/mer2/services/parser && npm run build
    cd /var/www/mer2/services/embedder && npm run build
    cd /var/www/mer2/services/skill-extractor && npm run build
    cd /var/www/mer2/services/matcher && npm run build
    cd /var/www/mer2/services/feedback && npm run build
    cd /var/www/mer2/frontend && npm run build

## 9. Start Backend + Workers with PM2

The ecosystem file is already in this repo.

    cd /var/www/mer2
    pm2 start deploy/ecosystem.config.js
    pm2 save
    pm2 startup

Check status:

    pm2 status
    pm2 logs

## 10. Configure Nginx

Use included Nginx config file.

    sudo cp /var/www/mer2/deploy/nginx-mer2.conf /etc/nginx/sites-available/mer2
    sudo ln -sf /etc/nginx/sites-available/mer2 /etc/nginx/sites-enabled/mer2
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx

## 11. Verify Deployment

Open:

- http://40.192.28.131
- http://40.192.28.131/health

If issues occur:

    pm2 logs mer2-backend
    pm2 logs mer2-parser
    pm2 logs mer2-embedder
    pm2 logs mer2-skill-extractor
    pm2 logs mer2-matcher
    pm2 logs mer2-feedback
    sudo tail -f /var/log/nginx/error.log

## 12. Common Fixes

1. API not reachable from frontend
- Confirm API_PORT=4000 in backend .env
- Confirm Nginx proxy in deploy/nginx-mer2.conf
- Restart backend app in PM2: pm2 restart mer2-backend

2. Resume pipeline stuck
- Check parser/embedder/matcher/feedback logs with pm2 logs
- Confirm Docker containers for Redis/Kafka are running

3. CORS errors
- Ensure CORS_ORIGINS contains http://40.192.28.131
- Restart backend PM2 process after changing .env

## 13. Optional HTTPS (Domain Required)

If you attach a domain later:

    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com

Certbot will update Nginx and enable HTTPS automatically.
