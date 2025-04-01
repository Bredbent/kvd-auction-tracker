#!/bin/bash

# Create a crontab file
cat > backup-crontab << 'CRON'
# Run backup at midnight every day
0 0 * * * /backup.sh >> /backup/cron.log 2>&1
CRON

# Update docker-compose.yml to use the crontab
sed -i.bak '/command: bash -c/c\    command: bash -c "chmod +x /backup.sh && crontab /backup-crontab && crond -f"' docker-compose.yml

# Copy the crontab file to the project directory
mv backup-crontab .

echo "Daily backup at midnight has been set up!"
echo "Restart your containers with: docker compose down && docker compose up -d"
