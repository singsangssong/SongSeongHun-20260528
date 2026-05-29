from __future__ import annotations

import json
from dataclasses import asdict, dataclass

from levit_pipeline.normalizer import Product


@dataclass(frozen=True)
class ProductChunk:
    product_id: str
    chunk_index: int
    chunk_type: str
    content: str
    metadata_json: str

    def to_dict(self) -> dict[str, str | int]:
        return asdict(self)


def build_product_chunks(product: Product) -> list[ProductChunk]:
    sections = [
        ("summary", _summary_text(product)),
        ("ingredients", _ingredients_text(product)),
        ("claims", _list_text("기능성/특징", product.claims)),
        ("cautions", _list_text("주의사항", product.cautions)),
        ("reviews", _reviews_text(product)),
    ]
    chunks: list[ProductChunk] = []
    for chunk_type, content in sections:
        if not content:
            continue
        chunks.append(
            ProductChunk(
                product_id=product.product_id,
                chunk_index=len(chunks),
                chunk_type=chunk_type,
                content=content,
                metadata_json=_metadata_json(product, chunk_type),
            )
        )
    return chunks


def build_chunks_for_products(products: list[Product]) -> list[ProductChunk]:
    chunks: list[ProductChunk] = []
    for product in products:
        chunks.extend(build_product_chunks(product))
    return chunks


def _summary_text(product: Product) -> str:
    parts = [f"상품명: {product.name}"]
    if product.brand:
        parts.append(f"브랜드: {product.brand}")
    if product.price is not None:
        parts.append(f"가격: {product.price}원")
    parts.append(f"리뷰 수: {product.review_count}")
    return "\n".join(parts)


def _ingredients_text(product: Product) -> str:
    if not product.ingredients:
        return ""
    lines = []
    for ingredient in product.ingredients:
        amount = f" {ingredient.amount}" if ingredient.amount else ""
        lines.append(f"- {ingredient.name}{amount}")
    return "성분/함량\n" + "\n".join(lines)


def _list_text(title: str, values: list[str]) -> str:
    if not values:
        return ""
    return title + "\n" + "\n".join(f"- {value}" for value in values)


def _reviews_text(product: Product) -> str:
    if not product.reviews:
        return ""
    lines = []
    for review in product.reviews:
        rating = f"{review.rating}점 " if review.rating is not None else ""
        lines.append(f"- {rating}{review.text}")
    return "리뷰 요약 원문\n" + "\n".join(lines)


def _metadata_json(product: Product, chunk_type: str) -> str:
    return json.dumps(
        {
            "product_id": product.product_id,
            "product_name": product.name,
            "brand": product.brand,
            "chunk_type": chunk_type,
            "source_url": product.source_url,
        },
        ensure_ascii=False,
        sort_keys=True,
    )
