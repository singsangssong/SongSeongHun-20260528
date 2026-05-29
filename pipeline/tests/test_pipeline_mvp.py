import json
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from io import StringIO
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))


class PipelineMvpTests(unittest.TestCase):
    def test_json_file_source_reads_raw_products_without_network(self):
        from levit_pipeline.crawler import JsonFileProductSource

        with tempfile.TemporaryDirectory() as tmpdir:
            raw_path = Path(tmpdir) / "raw_products.json"
            raw_path.write_text(
                json.dumps(
                    [
                        {
                            "source_product_id": "sample-1",
                            "name": "워킹맘 멀티비타민",
                            "brand": "Levit Sample",
                            "ingredients": [{"name": "비타민D", "amount": "25 ug"}],
                        }
                    ],
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            products = JsonFileProductSource(raw_path).fetch()

        self.assertEqual(products[0]["source_product_id"], "sample-1")
        self.assertEqual(products[0]["name"], "워킹맘 멀티비타민")

    def test_normalizer_maps_raw_product_into_stable_shape(self):
        from levit_pipeline.normalizer import normalize_product

        raw = {
            "source_product_id": "sample-1",
            "name": "워킹맘 멀티비타민",
            "brand": "Levit Sample",
            "price": "19900",
            "ingredients": [
                {"name": "비타민D", "amount": "25 ug"},
                {"name": "마그네슘", "amount": "100 mg"},
            ],
            "claims": ["뼈 건강에 도움을 줄 수 있음"],
            "cautions": ["임신 중이거나 약을 복용 중이면 전문가와 상담"],
            "reviews": [
                {"rating": 5, "text": "알약 크기가 작아 먹기 편해요."},
                {"rating": 4, "text": "향이 강하지 않아요."},
            ],
            "source_url": "https://example.test/products/sample-1",
        }

        product = normalize_product(raw)

        self.assertEqual(product.product_id, "sample-1")
        self.assertEqual(product.name, "워킹맘 멀티비타민")
        self.assertEqual(product.price, 19900)
        self.assertEqual(product.ingredients[0].name, "비타민D")
        self.assertEqual(product.cautions, ["임신 중이거나 약을 복용 중이면 전문가와 상담"])
        self.assertEqual(product.review_count, 2)

    def test_normalizer_reports_product_position_for_required_field_errors(self):
        from levit_pipeline.normalizer import normalize_products

        raw_products = [
            {"source_product_id": "source-1", "name": "정상 상품"},
            {"source_product_id": "source-2"},
        ]

        with self.assertRaises(ValueError) as raised:
            normalize_products(raw_products)

        self.assertIn("raw_products[1]", str(raised.exception))
        self.assertIn("missing required product field: name", str(raised.exception))

    def test_chunker_creates_deterministic_product_chunks(self):
        from levit_pipeline.chunker import build_product_chunks
        from levit_pipeline.normalizer import normalize_product

        product = normalize_product(
            {
                "source_product_id": "sample-1",
                "name": "워킹맘 멀티비타민",
                "brand": "Levit Sample",
                "ingredients": [{"name": "비타민D", "amount": "25 ug"}],
                "claims": ["뼈 건강에 도움을 줄 수 있음"],
                "cautions": ["임신 중이거나 약을 복용 중이면 전문가와 상담"],
                "reviews": [{"rating": 5, "text": "먹기 편해요."}],
            }
        )

        chunks = build_product_chunks(product)

        self.assertEqual([chunk.chunk_index for chunk in chunks], list(range(len(chunks))))
        self.assertEqual(chunks[0].product_id, "sample-1")
        self.assertEqual(chunks[0].chunk_type, "summary")
        self.assertIn("워킹맘 멀티비타민", chunks[0].content)
        self.assertTrue(any("임신 중" in chunk.content for chunk in chunks))
        self.assertIn('"product_id": "sample-1"', chunks[0].metadata_json)

    def test_chunker_skips_optional_sections_when_raw_fields_are_missing(self):
        from levit_pipeline.chunker import build_product_chunks
        from levit_pipeline.normalizer import normalize_product

        product = normalize_product(
            {
                "source_product_id": "source-1",
                "name": "여성 멀티비타민",
                "ingredients": [{"name": "비타민D", "amount": "25 ug"}],
            }
        )

        chunks = build_product_chunks(product)

        self.assertEqual([chunk.chunk_type for chunk in chunks], ["summary", "ingredients"])

    def test_dbapi_writer_uses_parameterized_insert_interface(self):
        from levit_pipeline.chunker import build_product_chunks
        from levit_pipeline.normalizer import normalize_product
        from levit_pipeline.writer import DbApiProductWriter

        product = normalize_product(
            {
                "source_product_id": "sample-1",
                "name": "워킹맘 멀티비타민",
                "brand": "Levit Sample",
                "ingredients": [{"name": "비타민D", "amount": "25 ug"}],
            }
        )
        chunks = build_product_chunks(product)
        connection = FakeConnection()

        DbApiProductWriter(connection).write([product], chunks)

        statements = [statement for statement, _params in connection.cursor_obj.executed]
        self.assertTrue(any("SELECT id" in statement for statement in statements))
        self.assertTrue(any("INSERT INTO products" in statement for statement in statements))
        self.assertTrue(any("DELETE FROM product_chunks" in statement for statement in statements))
        self.assertTrue(any("INSERT INTO product_chunks" in statement for statement in statements))
        product_chunk_params = connection.cursor_obj.executed[-1][1]
        self.assertEqual(product_chunk_params[0], 101)
        self.assertTrue(connection.committed)

    def test_pipeline_run_imports_raw_products_into_writer(self):
        from levit_pipeline.cli import run_pipeline

        raw_product = {
            "source_product_id": "source-1",
            "name": "여성 멀티비타민",
            "brand": "Brand A",
            "ingredients": [{"name": "비타민D", "amount": "25 ug"}],
            "claims": ["피로 개선에 도움을 줄 수 있음"],
        }
        writer = FakeWriter()

        with tempfile.TemporaryDirectory() as tmpdir:
            raw_path = Path(tmpdir) / "raw_products.json"
            raw_path.write_text(json.dumps([raw_product], ensure_ascii=False), encoding="utf-8")

            result = run_pipeline(raw_path=raw_path, writer=writer)

        self.assertEqual(result.product_count, 1)
        self.assertGreaterEqual(result.chunk_count, 3)
        self.assertEqual(writer.products[0].product_id, "source-1")
        self.assertTrue(any(chunk.chunk_type == "ingredients" for chunk in writer.chunks))

    def test_mysql_url_parser_supports_local_compose_port(self):
        from levit_pipeline.mysql import parse_mysql_url

        config = parse_mysql_url("mysql://levit:secret@127.0.0.1:13306/levit_assignment")

        self.assertEqual(config.host, "127.0.0.1")
        self.assertEqual(config.port, 13306)
        self.assertEqual(config.user, "levit")
        self.assertEqual(config.password, "secret")
        self.assertEqual(config.database, "levit_assignment")

    def test_cli_reports_missing_raw_file_without_traceback(self):
        from levit_pipeline.cli import main

        missing_path = Path("/tmp/levit-missing-raw-products.json")

        stderr = StringIO()
        with redirect_stderr(stderr):
            exit_code = main(["--raw", str(missing_path), "--out-dir", "/tmp/levit-out"])

        self.assertEqual(exit_code, 1)
        self.assertIn("raw product file not found", stderr.getvalue())


class FakeConnection:
    def __init__(self):
        self.cursor_obj = FakeCursor()
        self.committed = False

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.committed = True


class FakeCursor:
    def __init__(self):
        self.executed = []
        self.lastrowid = 101

    def execute(self, statement, params):
        self.executed.append((statement, params))

    def fetchone(self):
        return None


class FakeWriter:
    def __init__(self):
        self.products = []
        self.chunks = []

    def write(self, products, chunks):
        self.products = products
        self.chunks = chunks


if __name__ == "__main__":
    unittest.main()
