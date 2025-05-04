# Use official Python slim image to reduce size
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies for TensorFlow and other libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libblas3 \
    liblapack3 \
    libatlas-base-dev \
    gfortran \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire ml-service directory (filtered by .dockerignore)
COPY . .

# Expose port 8000 (FastAPI default)
EXPOSE 8000

# Command to run the FastAPI app with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]