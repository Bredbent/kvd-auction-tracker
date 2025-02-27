#!/bin/bash

# Exit on error except when running tests
# We'll handle the pytest exit code manually.
set -e

# Create test results directory
mkdir -p test-results/allure-results test-results/coverage

# Install test dependencies
pip install -r requirements-test.txt

# Set environment variables for testing
export TEST_DATABASE_URL="postgresql+asyncpg://kvd_user:devpassword123@localhost:5432/kvd_test"

#
# 1. RUN TESTS and CAPTURE the EXIT CODE
#

pytest_exit_code=0

echo "Running tests..."

# Run the tests, but do NOT exit on failure
# If tests fail, capture the exit code manually.
if [ "$1" == "unit" ]; then
    echo "Running unit tests..."
    python -m pytest src/tests/unit -v --alluredir=test-results/allure-results || pytest_exit_code=$?
elif [ "$1" == "integration" ]; then
    echo "Running integration tests..."
    python -m pytest src/tests/integration -v --alluredir=test-results/allure-results || pytest_exit_code=$?
elif [ "$1" == "e2e" ]; then
    echo "Running e2e tests..."
    python -m pytest src/tests/e2e -v --alluredir=test-results/allure-results || pytest_exit_code=$?
elif [ "$1" == "all" ]; then
    echo "Running all tests..."
    python -m pytest -v --alluredir=test-results/allure-results || pytest_exit_code=$?
else
    echo "No specific suite specified (or unrecognized). Running all tests..."
    python -m pytest -v --alluredir=test-results/allure-results || pytest_exit_code=$?
fi

#
# 2. ALWAYS GENERATE AND OPEN the ALLURE REPORT
#
if command -v allure &> /dev/null; then
    echo "Generating Allure report..."
    allure generate test-results/allure-results -o test-results/allure-report --clean
    echo "Allure report generated at test-results/allure-report"

    echo "Opening Allure report..."
    # This will start an Allure web server on a random port, and attempt to open your browser
    allure open test-results/allure-report
    echo "Allure report is now being served. Press Ctrl+C to stop the server."
else
    echo "Allure CLI is not installed or not on PATH."
    echo "You can manually run:"
    echo "    allure generate test-results/allure-results -o test-results/allure-report --clean"
    echo "    allure open test-results/allure-report"
fi

# Optional: Test coverage report (if you’ve configured pytest-cov, for example).
echo "Test coverage report (if generated) is available at test-results/coverage/index.html"

#
# 3. EXIT WITH THE PYTEST EXIT CODE
#
# So your CI/CD or local shell can see if tests actually passed or failed.
exit $pytest_exit_code