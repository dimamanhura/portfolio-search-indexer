# Portfolio Search Indexer

An automated ETL (Extract, Transform, Load) microservice designed to synchronize relational data from MongoDB Atlas into an optimized Amazon OpenSearch cluster. This ensures the Next.js portfolio features lightning-fast, highly relevant global search capabilities.

## 🏗 Architecture Overview

1.  **Trigger:** An **Amazon EventBridge** cron job invokes this Lambda function nightly (e.g., during off-peak hours at 2:00 AM).
2.  **Extraction:** The Lambda connects to **MongoDB** via Prisma to pull all active portfolio entities (Projects, Tech Stack, Education, etc.).
3.  **Transformation:** Relational records are flattened and concatenated into a unified, search-optimized JSON format.
4.  **Wipe & Replace:** Using **AWS IAM SigV4 Authentication**, the Lambda connects to OpenSearch, deletes the existing index, and provisions a fresh one.
5.  **Load:** The transformed data is uploaded using the highly efficient OpenSearch `_bulk` API.

## 🛠 Tech Stack

- **Runtime:** Node.js 20.x (CommonJS)
- **Database:** MongoDB (via Prisma ORM)
- **Search Engine:** Amazon OpenSearch Service
- **Authentication:** AWS Signature Version 4 (SigV4)
- **Trigger:** Amazon EventBridge (Cron)
- **Deployment:** GitHub Actions

## 📂 Project Structure

```text
portfolio-search-indexer/
├── src/
│   ├── index.js        # Lambda entry point & orchestration
│   ├── extract.js      # Prisma queries to MongoDB
│   ├── transform.js    # Data flattening and mapping logic
│   └── opensearch.js   # OpenSearch client setup, index creation, & bulk upload
├── prisma/
│   └── schema.prisma   # Database schema for the MongoDB source
├── .github/
│   └── workflows/
│       └── deploy.yml  # Automated AWS Lambda deployment
├── package.json
└── README.md
```

## 🧠 OpenSearch Index Schema & Mapping

To provide lightning-fast full-text search, all relational MongoDB data is flattened into a single, optimized OpenSearch document structure. The index uses explicit mappings to control how data is tokenized by the search engine.

| Field             | Type      | Description                                                                                                         |
| :---------------- | :-------- | :------------------------------------------------------------------------------------------------------------------ |
| `id`              | `keyword` | The original MongoDB ObjectId for exact retrieval.                                                                  |
| `type`            | `keyword` | The entity type (e.g., `Project`, `Education`, `TechTool`) used for frontend UI filtering.                          |
| `title`           | `text`    | The primary name of the entity, tokenized for partial matches.                                                      |
| `subtitle`        | `text`    | Secondary context (e.g., job role or tech category).                                                                |
| `searchable_text` | `text`    | A concatenated mega-string of all relevant entity details (descriptions, tags, tools) to power multi-match queries. |

## 🚀 Environment Variables

Ensure the following variables are configured in the AWS Lambda Console. _Note: Because this Lambda uses IAM Execution Roles to securely access OpenSearch, no database passwords or API keys are required for the search engine._

- `MONGODB_URL`: Connection string for the source database (Prisma).
- `OPENSEARCH_ENDPOINT`: The IPv4 HTTPS endpoint of the OpenSearch domain (e.g., `[https://search-portfolio-cluster-xxxx.eu-north-1.es.amazonaws.com](https://search-portfolio-cluster-xxxx.eu-north-1.es.amazonaws.com)`).
- `OPENSEARCH_INDEX_NAME`: The target index name, used to separate environments (e.g., `portfolio-dev` or `portfolio-prod`).

## 🔒 Security

This service implements the Principle of Least Privilege.

- The OpenSearch cluster is entirely hidden from the public internet.
- The Lambda uses `AwsSigv4Signer` to dynamically sign requests using its AWS IAM Execution Role.
- Fine-Grained Access Control (FGAC) ensures the Lambda only has permission to manage its specific `OPENSEARCH_INDEX_NAME` target.
