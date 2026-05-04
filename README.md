# Portfolio Search Indexer

An automated ETL (Extract, Transform, Load) microservice designed to synchronize relational data from **MongoDB Atlas** into an optimized **Amazon OpenSearch** cluster. This ensures the Next.js portfolio features lightning-fast, highly relevant global search capabilities.

## 🏗 Architecture Overview

1.  **Trigger:** An **Amazon EventBridge** cron job invokes this Lambda function (e.g., nightly).
2.  **Extraction:** The Lambda connects to **MongoDB** using the native driver to fetch Achievements, Projects, Companies, Feedback, and Technologies.
3.  **Transformation:** Relational records are processed via specialized transformers that flatten metadata into a unified `searchable_text` field for full-text indexing.
4.  **Wipe & Replace:** To maintain data integrity and index cleanliness, the service checks for the existing index, deletes it, and provisions a fresh one with explicit mappings.
5.  **Load:** The transformed data is uploaded to OpenSearch. Note: Documents are indexed individually to bypass root-domain `_bulk` permission constraints.

## 🛠 Tech Stack

- **Runtime:** Node.js 20.x (TypeScript / ES Modules)
- **Database:** MongoDB (Native Node.js Driver)
- **Search Engine:** Amazon OpenSearch Service
- **Authentication:** AWS Signature Version 4 (SigV4)
- **Observability:** AWS Lambda Powertools (Logger)
- **Testing:** Vitest (Aiming for 95%+ Coverage)

## 📂 Project Structure

```text
src/
├── __tests__/        # Unit tests with 95%+ coverage
├── types/            # Centralized TypeScript interfaces
├── config.ts         # Environment variable validation
├── db.ts             # MongoDB connection & aggregation logic
├── index.ts          # Lambda entry point & orchestration
├── logger.ts         # Powertools logger initialization
├── open-search.ts    # OpenSearch client & index management
├── response.ts       # API Gateway response helpers
└── transformers.ts   # Data mapping logic
```

## 🧠 OpenSearch Index Schema & Mapping

All relational MongoDB data is flattened into a single, optimized structure. Explicit mappings control tokenization and keyword storage.

| Field             | Type      | Description                                                     |
| :---------------- | :-------- | :-------------------------------------------------------------- |
| `id`              | `keyword` | The original MongoDB ObjectId for exact retrieval.              |
| `type`            | `keyword` | The entity type (e.g., `project`, `achievement`) for filtering. |
| `title`           | `text`    | Primary name, tokenized for partial matches.                    |
| `subtitle`        | `text`    | Secondary context (e.g., tech stack or author).                 |
| `image`           | `keyword` | URL to the entity logo or visual (optional).                    |
| `searchable_text` | `text`    | Concentrated field containing all descriptions and tags.        |

## 🚀 Environment Variables

Ensure these are configured in the AWS Lambda Console. The service uses **IAM SigV4** to sign requests, eliminating the need for hardcoded OpenSearch credentials.

- `MONGODB_URL`: Connection string for the source MongoDB.
- `OPENSEARCH_ENDPOINT`: The HTTPS endpoint of the OpenSearch domain.
- `OPENSEARCH_INDEX_NAME`: The target index name (e.g., `portfolio-search`).
- `AWS_REGION`: The region where OpenSearch is deployed (e.g., `us-east-1`).
- `LOG_LEVEL`: (Optional) `DEBUG`, `INFO`, `WARN`, or `ERROR`.

## 🔒 Security

- **IAM SigV4:** Requests are signed using the Lambda's IAM Execution Role credentials.
- **Explicit Mappings:** Prevents mapping explosions by defining field types upfront.
- **Individual Indexing:** Ensures robust delivery even if bulk-level permissions are restricted.
