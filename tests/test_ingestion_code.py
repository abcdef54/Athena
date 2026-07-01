import os
import pytest
import importlib
from unittest.mock import MagicMock

import src.backend.ai.langchain.vector_db as vector_db_module
importlib.reload(vector_db_module)
RealLocalMindVectorDB = vector_db_module.LocalMindVectorDB

class DummyLocalMindVectorDB(RealLocalMindVectorDB):
    def __init__(self, vector_store=None):
        self._vector_store = vector_store or MagicMock()

pytestmark = pytest.mark.asyncio

async def test_extract_and_split_docs_python(tmp_path):
    # Setup temporary python file
    code_content = """def calculate_sum(a, b):
    # A simple addition function
    return a + b

def test_function():
    print("Testing 1 2 3")
"""
    file_path = tmp_path / "test_script.py"
    file_path.write_text(code_content, encoding="utf-8")
    
    db = DummyLocalMindVectorDB()
    # Call parser
    chunks = db._extract_and_split_docs(str(file_path), "py", chunk_size=50, chunk_overlap=10)
    
    assert len(chunks) > 0
    # Check that chunks contain our content
    combined_content = "".join([c.page_content for c in chunks])
    assert "calculate_sum" in combined_content
    assert "test_function" in combined_content

async def test_extract_and_split_docs_all_languages(tmp_path):
    languages = {
        "js": ("test.js", "function greet(name) {\n  return `Hello, ${name}!`;\n}"),
        "cpp": ("test.cpp", "#include <iostream>\nint main() {\n  std::cout << \"Hello\";\n  return 0;\n}"),
        "html": ("test.html", "<!DOCTYPE html>\n<html><body><h1>Heading</h1></body></html>"),
        "css": ("test.css", "body {\n  background-color: #ffffff;\n  color: #333333;\n}"),
        "txt": ("test.txt", "This is just simple plain text contents for testing.")
    }
    
    db = DummyLocalMindVectorDB()
    for lang, (filename, content) in languages.items():
        file_path = tmp_path / filename
        file_path.write_text(content, encoding="utf-8")
        
        chunks = db._extract_and_split_docs(str(file_path), lang, chunk_size=50, chunk_overlap=10)
        assert len(chunks) > 0
        combined_content = "".join([c.page_content for c in chunks])
        assert len(combined_content) > 0

async def test_ingest_docs_with_mock_vector_store(tmp_path):
    code_content = "def test_ingest():\n    return 'Ingested!'\n"
    file_path = tmp_path / "test_ingest.py"
    file_path.write_text(code_content, encoding="utf-8")
    
    mock_vs = MagicMock()
    mock_vs.add_documents = MagicMock()
    db = DummyLocalMindVectorDB(vector_store=mock_vs)
    
    # Call ingest docs
    await db.ingest(
        file_path=str(file_path),
        attachment_id="mock-attachment-id",
        chunk_size=100,
        chunk_overlap=10
    )
    
    # Assert mock was called
    mock_vs.add_documents.assert_called_once()
    called_args = mock_vs.add_documents.call_args[0]
    chunks = called_args[0]
    
    # Verify chunks and metadata
    assert len(chunks) > 0
    for chunk in chunks:
        assert chunk.metadata["source_file_id"] == "mock-attachment-id"
        assert "test_ingest" in chunk.page_content

async def test_extract_and_split_docs_docx(tmp_path):
    import docx
    docx_path = tmp_path / "test_doc.docx"
    doc = docx.Document()
    doc.add_paragraph("This is a sample docx text content for ingestion testing.")
    doc.save(str(docx_path))
    db = DummyLocalMindVectorDB()
    chunks = db._extract_and_split_docs(str(docx_path), "docx", chunk_size=100, chunk_overlap=10)
    assert len(chunks) > 0
    combined_content = "".join([c.page_content for c in chunks])
    assert "docx text content" in combined_content

