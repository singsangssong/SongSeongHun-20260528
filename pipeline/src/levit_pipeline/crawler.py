from __future__ import annotations

import json
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


RawProduct = dict[str, Any]


class ProductCrawler(ABC):
    """Interface for product data sources.

    Real web crawlers should implement this interface later after checking each
    target site's terms, robots policy, rate limits, and blocking behavior.
    """

    @abstractmethod
    def fetch(self) -> list[RawProduct]:
        raise NotImplementedError


class JsonFileProductSource(ProductCrawler):
    """Loads caller-provided raw product JSON from disk."""

    def __init__(self, path: str | Path):
        self.path = Path(path)

    def fetch(self) -> list[RawProduct]:
        with self.path.open("r", encoding="utf-8") as file:
            data = json.load(file)
        if not isinstance(data, list):
            raise ValueError("raw product file must be a JSON array")
        return [self._ensure_object(item) for item in data]

    @staticmethod
    def _ensure_object(item: Any) -> RawProduct:
        if not isinstance(item, dict):
            raise ValueError("each raw product must be a JSON object")
        return item
