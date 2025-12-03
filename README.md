# Publitas Backend

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24.1-green)](https://nodejs.org/)

- Parses the product file feed.xml.

- For each product, extracts the id, title and description.

- Batches them together and calls the provided external service for each batch

A batch should

- Be a JSON encoded array of the form:

```
[{id: 'id', title: 'title', description: 'description'}, ...]
```

- As close to as possible, but strictly below 5 megabytes in size

## 🚀 Quick Start

### Using npm

```bash
# Clone the repository
git clone <repository-url>
cd publitas-backend
cp .env.example .env

# Install
npm install

# Build and run
npm run build
npm run start
```

### Using Docker

```bash
# Start the container (stays running)
docker compose up -d

# Execute the feed processor
docker compose exec feed-processor node dist/src/index.js
```

## 📋 Table of Contents

- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Testing](#testing)

## 📁 Project Structure

```
publitas-backend/
├── src/                         # Application source code
│   ├── services/                # Service layer
│   │   ├── batch.service.ts     # Batch processing logic
│   │   └── external.service.ts  # External Service integration
│   ├── types/                   # Shared TypeScript types
│   │   └── product.ts           # Product type definitions
│   ├── feed-parser.ts           # XML feed parsing and transformation
│   └── index.ts                 # Library entry point
├── test/
|── ├── integration/             # Integration tests
│   ├── services/
│   │   ├── batch.service.test.ts
│   │   └── external.service.test.ts
│   └── feed-parser.test.ts
├── data/                        # Sample input data
│   └── feed.xml
├── dist/                        # Compiled JavaScript output

├── Dockerfile                   # Docker image definition
├── docker-compose.yml           # Docker Compose configuration
├── .dockerignore                # Files excluded from Docker build
├── eslint.config.mjs            # ESLint configuration
├── jest.config.js               # Jest configuration
├── prettier.config.js           # Prettier configuration
├── package.json                 # NPM scripts and dependencies
├── package-lock.json
└── tsconfig.json                # TypeScript configuration
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 24.1 with TypeScript
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

## 🧪 Testing

```bash
# Run all tests
npm run test
```
