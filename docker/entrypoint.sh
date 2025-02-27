#!/bin/bash
set -e

# Start Xvfb in the background
Xvfb :99 -screen 0 1280x1024x24 &

# Wait for Xvfb to start
sleep 1

# Execute the CMD
exec "$@"