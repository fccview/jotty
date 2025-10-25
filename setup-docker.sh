#!/bin/bash

# Setup script for Docker data directory permissions
echo "Setting up data directory permissions for Docker..."

# Create data directories if they don't exist
mkdir -p data/users
mkdir -p data/checklists
mkdir -p data/notes
mkdir -p cache

# Set proper permissions (matching the Docker container user)
chmod -R 755 data
chown -R 1000:1000 data

# Set proper permissions for cache directory (user 1000:1000 as per docker-compose.yml)
# This is optional - if you don't want cache persistence, comment out the cache volume in docker-compose.yml
chmod -R 755 cache
chown -R 1000:1000 cache

echo "Data and cache directory setup complete!"
echo "Note: Cache directory is optional. If you don't want cache persistence, comment out the cache volume in docker-compose.yml"
echo "You can now run: docker compose up -d" 