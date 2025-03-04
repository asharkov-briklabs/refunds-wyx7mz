#!/usr/bin/env python
"""
Setup configuration for the Brik Refunds Service.
"""

import os
import io
from setuptools import setup, find_packages

# Read file content, used for README.md
def read(filename):
    """Read the content of a file."""
    here = os.path.abspath(os.path.dirname(__file__))
    with io.open(os.path.join(here, filename), encoding='utf-8') as f:
        return f.read()

# Parse requirements.txt to get dependencies
def get_requirements():
    """Parse the requirements.txt file to get dependencies."""
    requirements = []
    here = os.path.abspath(os.path.dirname(__file__))
    try:
        with io.open(os.path.join(here, 'requirements.txt'), encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    requirements.append(line)
        return requirements
    except (IOError, FileNotFoundError):
        # If requirements.txt doesn't exist, return predefined list
        return [
            'flask>=2.3.0',
            'sqlalchemy>=2.0.0',
            'marshmallow>=3.20.0',
            'celery>=5.3.0',
            'pyjwt>=2.8.0',
            'pymongo>=6.0.0',
            'redis>=7.0.0',
            'boto3>=1.28.0',
            'requests>=2.31.0',
            'python-dotenv>=1.0.0',
            'gunicorn>=21.2.0',
            'pydantic>=2.4.0',
            'cryptography>=41.0.0',
            'jinja2>=3.1.0',
        ]

# Get README content
README = read('README.md') if os.path.exists('README.md') else ''

# Get requirements
REQUIREMENTS = get_requirements()

setup(
    name='brik-refunds-service',
    version='0.1.0',
    description='Comprehensive refund processing and management service for the Brik platform',
    long_description=README,
    packages=find_packages(exclude=['tests']),
    python_requires='>=3.11',
    install_requires=REQUIREMENTS,
    extras_require={
        'dev': [
            'pytest>=7.4.0',
            'pytest-cov>=4.1.0',
            'pytest-mock>=3.11.0',
            'black>=23.7.0',
            'flake8>=6.1.0',
            'isort>=5.12.0',
            'mypy>=1.5.0',
        ],
    },
    entry_points={
        'console_scripts': [
            'refunds-api=backend.api.server:main',
            'refunds-worker=backend.workers.processor:main',
        ],
    },
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Financial and Insurance Industry',
        'Programming Language :: Python :: 3.11',
        'Topic :: Office/Business :: Financial',
    ],
)