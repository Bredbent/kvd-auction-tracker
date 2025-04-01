#!/bin/bash
set -e

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-test.txt
pip install -e .

# Create logs directory if it doesn't exist
mkdir -p logs

echo "Development environment set up successfully!"
echo "To activate the virtual environment, run: source venv/bin/activate"
