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
AUTH_TOKEN_SECRET=local-dev-secret
CLIENT_ORIGIN=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3000
```

## Deploy

Vercel에는 React 앱만 배포합니다.

- Root Directory: `client`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_BASE_URL=https://api.example.com`

EC2에는 Node.js API와 MySQL을 Docker Compose로 배포합니다.

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec server npm run db:migrate
```

운영 서버 `.env`에는 최소 아래 값이 필요합니다.

```bash
API_PORT=3000
MYSQL_DATABASE=levit_assignment
MYSQL_USER=levit
MYSQL_PASSWORD=change-me
MYSQL_ROOT_PASSWORD=change-root
OPENAI_API_KEY=sk-...
AUTH_TOKEN_SECRET=change-to-long-random-secret
CLIENT_ORIGIN=https://your-vercel-project.vercel.app
```

상품 데이터를 원격 MySQL에 넣은 뒤에는 API 서버를 재시작해야 새 `product_chunks`가 RAG vector store에 반영됩니다.
MySQL은 EC2의 `127.0.0.1`에만 열어두고, 로컬에서 import할 때는 SSH 터널을 사용합니다.

```bash
ssh -L 13306:127.0.0.1:3306 ubuntu@EC2_PUBLIC_IP
```

다른 터미널에서:

```bash
cd pipeline
python -m levit_pipeline.cli \
  --raw ../data/raw_products.json \
  --mysql-url mysql://levit:change-me@127.0.0.1:13306/levit_assignment

ssh ubuntu@EC2_PUBLIC_IP
docker compose -f docker-compose.prod.yml restart server
```


과제 구현에 대한 설명, 강조하고 싶은 부분, 설계 의도, 아쉬웠던 점이나, 더 개선할 여지가 있는 부분 등
