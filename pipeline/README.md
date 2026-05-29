# Levit Pipeline

Python 기반 데이터 수집/정제 MVP 파이프라인입니다. Node.js 서버와 RAG 구현과 독립적으로 동작하며, 외부에서 수집한 raw JSON을 정규화하고 RAG용 product chunk로 변환합니다.

## 현재 범위

- `crawler`: 사이트별 crawler 또는 파일 입력 source로 교체 가능한 수집 인터페이스
- `normalizer`: raw 상품 데이터를 안정적인 상품 구조로 정규화
- `chunker`: 정규화 상품을 `product_chunks` 적재용 텍스트 청크로 변환
- `writer`: DB-API 호환 연결을 받는 MySQL writer
- `cli`: raw JSON을 읽어 JSON 산출물 생성 또는 MySQL import 수행

## 실행

raw 입력 파일은 레포에 커밋하지 않고 로컬 `data/` 또는 별도 작업 폴더에서 관리합니다.

```bash
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
python3 -m levit_pipeline.cli --raw ../data/raw_products.json --out-dir out
```

로컬 소스 경로를 직접 사용할 때:

```bash
cd pipeline
PYTHONPATH=src python3 -m levit_pipeline.cli --raw ../data/raw_products.json --out-dir out
```

MySQL에 바로 적재할 때:

```bash
cd pipeline
source .venv/bin/activate
python -m levit_pipeline.cli \
  --raw ../data/raw_products.json \
  --mysql-url mysql://levit:levit_password@127.0.0.1:13306/levit_assignment
```

JSON 산출물 생성과 MySQL import를 동시에 수행할 수도 있습니다.

## Raw JSON 입력 스키마

입력 파일은 상품 객체 배열이어야 합니다.

```json
[
  {
    "source_product_id": "mall-a-001",
    "name": "여성 멀티비타민",
    "brand": "브랜드A",
    "price": 19900,
    "ingredients": [
      { "name": "비타민D", "amount": "25ug" },
      { "name": "마그네슘", "amount": "100mg" }
    ],
    "claims": ["피로 개선에 도움"],
    "cautions": ["임신 중이거나 약 복용 중이면 전문가 상담"],
    "reviews": [
      { "rating": 5, "text": "알약이 작아서 먹기 편해요." }
    ],
    "source_url": "https://example.com/products/mall-a-001"
  }
]
```

필수 필드는 `source_product_id`, `name`입니다. 둘 중 하나가 비어 있으면 import를 중단하고 `raw_products[1]: missing required product field: name`처럼 문제가 있는 배열 위치를 출력합니다.

선택 필드는 `brand`, `price`, `ingredients`, `claims`, `cautions`, `reviews`, `source_url`입니다. 선택 필드가 없으면 빈 값으로 정규화합니다. `claims`, `cautions`, `reviews`처럼 섹션 내용이 비어 있으면 해당 `product_chunks` 행은 만들지 않습니다.

현재 chunk 생성 기준은 의미 섹션 단위입니다.

| 입력 필드 | chunk_type | 생성 조건 |
| --- | --- | --- |
| `name`, `brand`, `price`, `reviews` | `summary` | 항상 생성 |
| `ingredients` | `ingredients` | 성분이 1개 이상 있을 때 |
| `claims` | `claims` | 기능성/특징 문구가 1개 이상 있을 때 |
| `cautions` | `cautions` | 주의사항이 1개 이상 있을 때 |
| `reviews` | `reviews` | 리뷰가 1개 이상 있을 때 |

## 테스트

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s pipeline/tests
```

## 이후 확장 방향

- 사이트별 약관과 robots 정책을 확인한 뒤 실제 crawler 구현 추가
- raw 입력 파일은 레포에 커밋하지 않고 로컬/배치 환경에서 주입
- MySQL 드라이버 연결 코드는 실행 환경에서 주입
- chunk schema가 서버 migration과 달라지면 writer 매핑만 조정
