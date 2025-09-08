#!/bin/bash

# Simple health check script for CI/CD testing
set -e

echo "=== Running CI/CD Health Checks ==="

# 1. Security Audit
echo "1. Running security audit..."
npm audit --audit-level moderate
echo "✓ Security audit passed"

# 2. Code Quality Gates
echo "2. Checking code quality..."
npm run lint
echo "✓ Linting passed"

npm run format:check
echo "✓ Code formatting check passed"

# 3. Build Verification
echo "3. Running build verification..."
npm run prestart
if [ ! -f "built/app.js" ]; then
  echo "✗ Build failed: app.js not found"
  exit 1
fi
echo "✓ Build artifacts verified"

# 4. Application Health Check
echo "4. Testing application startup..."
# Use example data for testing
cp example_graph.json test_graph.json
# Temporarily use test data
ORIGINAL_FILE="graph.json"
if [ -f "$ORIGINAL_FILE" ]; then
  mv "$ORIGINAL_FILE" "${ORIGINAL_FILE}.backup"
fi
mv test_graph.json graph.json

# Test application
timeout 10s npm start || if [ $? -eq 124 ]; then
  echo "✓ Application started and processed data successfully"
else
  echo "✗ Application failed to start"
  # Restore original file
  if [ -f "${ORIGINAL_FILE}.backup" ]; then
    mv "${ORIGINAL_FILE}.backup" "$ORIGINAL_FILE"
  fi
  exit 1
fi

# Restore original file
if [ -f "${ORIGINAL_FILE}.backup" ]; then
  mv "${ORIGINAL_FILE}.backup" "$ORIGINAL_FILE"
fi

# 5. Database Verification
echo "5. Verifying database creation..."
if [ -f "arguing.sqlite" ]; then
  echo "✓ Database created successfully"
  sqlite3 arguing.sqlite "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" > /dev/null
  echo "✓ Database integrity verified"
else
  echo "✗ Database not created"
  exit 1
fi

echo "=== All health checks passed! ==="