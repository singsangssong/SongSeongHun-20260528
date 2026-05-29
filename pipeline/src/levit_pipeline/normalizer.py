from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class Ingredient:
    name: str
    amount: str = ""

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class Review:
    rating: int | None
    text: str

    def to_dict(self) -> dict[str, int | str | None]:
        return asdict(self)


@dataclass(frozen=True)
class Product:
    product_id: str
    name: str
    brand: str
    price: int | None
    ingredients: list[Ingredient]
    claims: list[str]
    cautions: list[str]
    reviews: list[Review]
    source_url: str

    @property
    def review_count(self) -> int:
        return len(self.reviews)

    def to_dict(self) -> dict[str, Any]:
        return {
            "product_id": self.product_id,
            "name": self.name,
            "brand": self.brand,
            "price": self.price,
            "ingredients": [ingredient.to_dict() for ingredient in self.ingredients],
            "claims": self.claims,
            "cautions": self.cautions,
            "reviews": [review.to_dict() for review in self.reviews],
            "review_count": self.review_count,
            "source_url": self.source_url,
        }


def normalize_product(raw: dict[str, Any]) -> Product:
    product_id = _required_text(raw, "source_product_id")
    name = _required_text(raw, "name")
    brand = _text(raw.get("brand"))
    ingredients = [_normalize_ingredient(item) for item in raw.get("ingredients", [])]
    reviews = [_normalize_review(item) for item in raw.get("reviews", [])]

    return Product(
        product_id=product_id,
        name=name,
        brand=brand,
        price=_parse_price(raw.get("price")),
        ingredients=ingredients,
        claims=_text_list(raw.get("claims", [])),
        cautions=_text_list(raw.get("cautions", [])),
        reviews=reviews,
        source_url=_text(raw.get("source_url")),
    )


def normalize_products(raw_products: list[dict[str, Any]]) -> list[Product]:
    products: list[Product] = []
    for index, raw in enumerate(raw_products):
        try:
            products.append(normalize_product(raw))
        except ValueError as exc:
            raise ValueError(f"raw_products[{index}]: {exc}") from exc
    return products


def _required_text(raw: dict[str, Any], key: str) -> str:
    value = _text(raw.get(key))
    if not value:
        raise ValueError(f"missing required product field: {key}")
    return value


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _text_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [text for text in (_text(item) for item in value) if text]


def _parse_price(value: Any) -> int | None:
    if value in (None, ""):
        return None
    if isinstance(value, int):
        return value
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    return int(digits) if digits else None


def _normalize_ingredient(value: Any) -> Ingredient:
    if isinstance(value, dict):
        return Ingredient(name=_text(value.get("name")), amount=_text(value.get("amount")))
    return Ingredient(name=_text(value))


def _normalize_review(value: Any) -> Review:
    if isinstance(value, dict):
        return Review(rating=_parse_rating(value.get("rating")), text=_text(value.get("text")))
    return Review(rating=None, text=_text(value))


def _parse_rating(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
