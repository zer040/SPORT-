"""
Pytest configuration and shared fixtures for Sport+ test suite.
"""

import pytest
import os

# Set testing environment variables
os.environ["APP_ENV"] = "testing"
os.environ["DEBUG"] = "true"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"
