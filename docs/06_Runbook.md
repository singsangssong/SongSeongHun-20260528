# Runbook: 실행, 데이터 적재, 배포, 테스트

## 1. Overview

이 문서는 프로젝트를 직접 실행하거나, 상품 데이터를 넣거나, 배포 서버를 확인할 때 사용하는 절차를 모아둔 문서입니다.

README는 과제 설명과 구현 의도를 중심으로 두고, 실제 명령어들은 이 문서에서 관리합니다.

---

## 2. Local Run

루트 `.env`를 사용합니다. `.env`는 커밋하지 않습니다.

```bash
MYSQL_HOST=localhost
MYSQL_PORT=13306
MYSQL_DATABASE=levit_assignment
MYSQL_USER=levit
MYSQL_PASSWORD=levit_password
MYSQL_ROOT_PASSWORD=root_password

OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
AUTH_TOKEN_SECRET=local-dev-secret
CLIENT_ORIGIN=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3000
```

MySQL 실행:

```bash
docker compose up -d
```

Server 실행:

```bash
cd server
npm install
npm run db:migrate
npm run dev
```

Client 실행:

```bash
cd client
npm install
npm run dev
```

- Server: `http://localhost:3000`
- Client: `http://localhost:5173`
- MySQL: `localhost:13306`

---

## 3. Data Import

상품 raw JSON을 RAG용 DB 데이터로 적재합니다.

```bash
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
python -m levit_pipeline.cli \
  --raw ../data/raw_products.json \
  --mysql-url mysql://levit:levit_password@127.0.0.1:13306/levit_assignment
```

현재 RAG vector store는 API 서버 시작 시점에 MySQL의 `product_chunks`를 읽습니다.
상품 데이터를 새로 import했다면 서버를 재시작해야 합니다.

---

## 4. Deploy

과제 제출용 배포는 EC2 단일 인스턴스에서 Docker Compose로 실행합니다.

```text
http://15.165.161.168
├── /        React client
├── /api     Node.js API
└── /health  API health check
```

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec server npm run db:migrate
```

자세한 배포 방향은 [docs/05_Deployment.md](./05_Deployment.md)에 정리했습니다.

---

## 5. Remote Data Import

원격 EC2의 MySQL에 상품 데이터를 넣을 때는 SSH tunnel을 사용합니다.

로컬 터미널 1:

```bash
ssh -L 13306:127.0.0.1:3306 ubuntu@15.165.161.168
```

로컬 터미널 2:

```bash
cd pipeline
source .venv/bin/activate
python -m levit_pipeline.cli \
  --raw ../data/raw_products.json \
  --mysql-url mysql://levit:change-me@127.0.0.1:13306/levit_assignment
```

import 후에는 EC2에서 서버를 재시작합니다.

```bash
docker compose -f docker-compose.prod.yml restart server
```

---

## 6. Tests

Server 테스트:

```bash
cd server
npm test
```

Client build 확인:

```bash
cd client
npm run build
```

Pipeline 테스트:

```bash
cd pipeline
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests
```

---

## 7. Health Check

로컬:

```bash
curl http://localhost:3000/health
```

배포 서버:

```bash
curl http://15.165.161.168/health
```
