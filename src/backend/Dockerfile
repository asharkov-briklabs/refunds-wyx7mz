# Build stage
FROM python:3.13-slim as build

# Set working directory
ARG APP_HOME=/app
WORKDIR ${APP_HOME}

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Install the application in development mode
RUN pip install -e .

# Create a non-root user to run the application
ARG APP_USER=appuser
ARG APP_USER_ID=1000
RUN groupadd -r ${APP_USER} && \
    useradd -r -g ${APP_USER} -u ${APP_USER_ID} -d ${APP_HOME} ${APP_USER} && \
    chown -R ${APP_USER}:${APP_USER} ${APP_HOME}

# Production stage for API service
FROM gcr.io/distroless/python3

ARG APP_HOME=/app
ARG APP_USER=appuser
ARG APP_USER_ID=1000

WORKDIR ${APP_HOME}

# Copy installed dependencies and application from the build stage
COPY --from=build /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=build ${APP_HOME} ${APP_HOME}

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV FLASK_APP=refunds_service.api.server
ENV PORT=3000
ENV NODE_ENV=production

# Use non-root user
USER ${APP_USER_ID}

# Expose the application port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the API service
CMD ["python", "-m", "refunds_service.api.server"]