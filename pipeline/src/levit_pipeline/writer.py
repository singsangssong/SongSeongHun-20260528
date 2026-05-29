from __future__ import annotations

import json
from typing import Protocol

from levit_pipeline.chunker import ProductChunk
from levit_pipeline.normalizer import Product


class ProductWriter(Protocol):
    def write(self, products: list[Product], chunks: list[ProductChunk]) -> None:
        ...


class JsonlProductWriter:
    """Simple file writer for offline inspection and fixtures."""

    def __init__(self, products_path, chunks_path):
        self.products_path = products_path
        self.chunks_path = chunks_path

    def write(self, products: list[Product], chunks: list[ProductChunk]) -> None:
        _write_jsonl(self.products_path, [product.to_dict() for product in products])
        _write_jsonl(self.chunks_path, [chunk.to_dict() for chunk in chunks])


class DbApiProductWriter:
    """MySQL writer using a PEP 249 compatible connection.

    The concrete MySQL driver is intentionally not imported here. Runtime code can
    pass a `mysql-connector-python` or `PyMySQL` connection later.
    """

    def __init__(self, connection):
        self.connection = connection

    def write(self, products: list[Product], chunks: list[ProductChunk]) -> None:
        cursor = self.connection.cursor()
        product_db_ids: dict[str, int] = {}
        for product in products:
            cursor.execute(
                """
                SELECT id
                FROM products
                WHERE name = %s AND brand <=> %s
                LIMIT 1
                """,
                (product.name, product.brand or None),
            )
            row = cursor.fetchone()
            if row:
                product_db_ids[product.product_id] = int(row[0])
                continue

            cursor.execute(
                """
                INSERT INTO products
                    (name, brand, category, source_url, source_name)
                VALUES
                    (%s, %s, %s, %s, %s)
                """,
                (
                    product.name,
                    product.brand or None,
                    "health_supplement",
                    product.source_url,
                    "levit_pipeline",
                ),
            )
            product_db_ids[product.product_id] = int(cursor.lastrowid)

        for product_db_id in product_db_ids.values():
            cursor.execute(
                """
                DELETE FROM product_chunks
                WHERE product_id = %s
                """,
                (product_db_id,),
            )

        for chunk in chunks:
            product_db_id = product_db_ids[chunk.product_id]
            metadata_json = _merge_metadata(
                chunk.metadata_json,
                {
                    "source_product_id": chunk.product_id,
                    "chunk_index": chunk.chunk_index,
                },
            )
            cursor.execute(
                """
                INSERT INTO product_chunks
                    (product_id, chunk_type, content, metadata, embedding_id)
                VALUES
                    (%s, %s, %s, %s, %s)
                """,
                (
                    product_db_id,
                    chunk.chunk_type,
                    chunk.content,
                    metadata_json,
                    None,
                ),
            )

        self.connection.commit()


def _write_jsonl(path, rows: list[dict]) -> None:
    with open(path, "w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False, sort_keys=True))
            file.write("\n")


def _merge_metadata(metadata_json: str, values: dict) -> str:
    metadata = json.loads(metadata_json) if metadata_json else {}
    metadata.update(values)
    return json.dumps(metadata, ensure_ascii=False, sort_keys=True)
