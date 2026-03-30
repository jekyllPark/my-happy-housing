FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements/base.txt requirements/base.txt
COPY requirements/local.txt requirements/local.txt
RUN pip install --no-cache-dir -r requirements/local.txt

COPY . .

RUN mkdir -p /app/logs

EXPOSE 8000
