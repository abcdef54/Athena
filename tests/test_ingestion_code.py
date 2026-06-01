import os
import pytest
from src.backend.agents.config import _extract_and_split_docs, ingest_docs
from tests.conftest import mock_vector_store

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
    
    # Call parser
    chunks = _extract_and_split_docs(str(file_path), "py", chunk_size=50, chunk_overlap=10)
    
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
    
    for lang, (filename, content) in languages.items():
        file_path = tmp_path / filename
        file_path.write_text(content, encoding="utf-8")
        
        chunks = _extract_and_split_docs(str(file_path), lang, chunk_size=50, chunk_overlap=10)
        assert len(chunks) > 0
        combined_content = "".join([c.page_content for c in chunks])
        assert len(combined_content) > 0

async def test_ingest_docs_with_mock_vector_store(tmp_path):
    code_content = "def test_ingest():\n    return 'Ingested!'\n"
    file_path = tmp_path / "test_ingest.py"
    file_path.write_text(code_content, encoding="utf-8")
    
    # Reset mock call history
    mock_vector_store.add_documents.reset_mock()
    
    # Call ingest docs
    await ingest_docs(
        file_path=str(file_path),
        attachment_id="mock-attachment-id",
        chunk_size=100,
        chunk_overlap=10,
        user_id="test-user-id"
    )
    
    # Assert mock was called
    mock_vector_store.add_documents.assert_called_once()
    called_args = mock_vector_store.add_documents.call_args[0]
    chunks = called_args[0]
    
    # Verify chunks and metadata
    assert len(chunks) > 0
    for chunk in chunks:
        assert chunk.metadata["source_file_id"] == "mock-attachment-id"
        assert "test_ingest" in chunk.page_content
