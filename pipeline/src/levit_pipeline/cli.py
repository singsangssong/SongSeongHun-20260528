from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path

from levit_pipeline.chunker import build_chunks_for_products
from levit_pipeline.crawler import JsonFileProductSource
from levit_pipeline.mysql import connect_mysql
from levit_pipeline.normalizer import normalize_products
from levit_pipeline.writer import DbApiProductWriter


@dataclass(frozen=True)
class PipelineResult:
    product_count: int
    chunk_count: int


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import raw product JSON into RAG product chunks.")
    parser.add_argument("--raw", required=True, help="Path to raw product JSON array.")
    parser.add_argument("--out-dir", help="Directory for generated JSON outputs.")
    parser.add_argument("--mysql-url", help="MySQL URL for direct products/product_chunks import.")
    args = parser.parse_args(argv)

    if not args.out_dir and not args.mysql_url:
        parser.error("one of --out-dir or --mysql-url is required")

    try:
        result = run_pipeline(
            raw_path=Path(args.raw),
            out_dir=Path(args.out_dir) if args.out_dir else None,
            writer=_create_db_writer(args.mysql_url) if args.mysql_url else None,
        )
    except FileNotFoundError:
        print(f"raw product file not found: {args.raw}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as exc:
        print(f"raw product file is not valid JSON: {exc}", file=sys.stderr)
        return 1
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"imported {result.product_count} products and {result.chunk_count} chunks")
    return 0


def run_pipeline(raw_path: str | Path, writer=None, out_dir: str | Path | None = None) -> PipelineResult:
    raw_products = JsonFileProductSource(raw_path).fetch()
    products = normalize_products(raw_products)
    chunks = build_chunks_for_products(products)

    if out_dir is not None:
        _write_outputs(Path(out_dir), products, chunks)
    if writer is not None:
        writer.write(products, chunks)

    return PipelineResult(product_count=len(products), chunk_count=len(chunks))


def _create_db_writer(mysql_url: str) -> DbApiProductWriter:
    return DbApiProductWriter(connect_mysql(mysql_url))


def _write_outputs(out_dir: Path, products, chunks) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    _write_json(out_dir / "normalized_products.json", [product.to_dict() for product in products])
    _write_json(out_dir / "product_chunks.json", [chunk.to_dict() for chunk in chunks])


def _write_json(path: Path, rows: list[dict]) -> None:
    path.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    raise SystemExit(main())
