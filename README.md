# Levit Assignment

AI 건강기능식품 추천/요약 에이전트 과제용 레포지토리입니다.

## Project Structure

```text
client/   React chat UI
server/   Node.js API server
pipeline/ Python product ingestion pipeline
```

Server code follows a feature-first shape:

```text
server/src/
├── domain
│   ├── chat
│   ├── product
│   ├── rag
│   └── user
└── global
    ├── config
    ├── db
    ├── llm
    └── vector
```

## Local Run

```bash
docker compose up -d
cd server
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

상품 raw JSON을 RAG용 DB 데이터로 적재할 때:

```bash
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
python -m levit_pipeline.cli \
  --raw ../data/raw_products.json \
  --mysql-url mysql://levit:levit_password@127.0.0.1:13306/levit_assignment
```

```bash
cd client
npm install
npm run dev
```

- Server: `http://localhost:3000`
- Client: `http://localhost:5173`
- MySQL: `localhost:${MYSQL_PORT:-3306}`

## Environment

로컬 실행은 루트 `.env`를 사용합니다. `.env`는 커밋하지 않습니다.

```bash
MYSQL_HOST=localhost
MYSQL_PORT=13306
MYSQL_DATABASE=levit_assignment
MYSQL_USER=levit
MYSQL_PASSWORD=levit_password
MYSQL_ROOT_PASSWORD=root_password

OPENAI_API_KEY=
```
