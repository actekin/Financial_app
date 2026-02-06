# Financial App Test Environment

This repository contains a lightweight test environment so you can run the app locally and try it out.

## Requirements
- Docker + Docker Compose

## Getting Started
```bash
docker compose up --build
```

Then open http://localhost:8000 in your browser.

## Configuration
Copy the example environment file and tweak as needed:
```bash
cp .env.example .env
```

## Stopping
```bash
docker compose down
```
