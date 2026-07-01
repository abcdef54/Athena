import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from langchain_core.runnables import RunnableConfig
from langchain.messages import AIMessage, HumanMessage

from src.backend.ai.langchain.tools import retrieve_context, fetch_web_page, tavily_search

pytestmark = pytest.mark.asyncio


async def test_tool_retrieve_context():
    mock_doc = MagicMock()
    mock_doc.metadata = {"source": "quantum_computing.pdf", "source_file_id": "test-file-id"}
    mock_doc.page_content = "Quantum computing uses qubits instead of bits."
    
    with patch("src.backend.ai.langchain.tools.LocalMindVectorDB.query", AsyncMock(return_value=[mock_doc])):
        serialized_text, artifact = await retrieve_context.coroutine(
            query="What is quantum computing?",
            k_returns=1
        )
        
        assert "Source: quantum_computing.pdf" in serialized_text
        assert "Quantum computing uses qubits" in serialized_text
        assert artifact["source_file_ids"] == ["test-file-id"]


async def test_tool_fetch_web_page():
    mock_html = "<html><body><main><article><h2>Web Title</h2><p>This is extracted body content.</p></article></main></body></html>"
    
    mock_response = MagicMock()
    mock_response.text = mock_html
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient.get", AsyncMock(return_value=mock_response)):
        res_text = await fetch_web_page.ainvoke({"url": "https://example.com/quantum"})
        assert "This is extracted body content" in res_text
        assert "Web Title" in res_text


async def test_get_localmind_system_instruction_personalities():
    from src.backend.ai.system_prompt import get_localmind_system_instruction_with_personality
    
    # 1. Test General
    general_prompt = get_localmind_system_instruction_with_personality("general")
    assert "You are LocalMind, a precise and resourceful research and conversation assistant." in general_prompt

    # 2. Test Coder
    coder_prompt = get_localmind_system_instruction_with_personality("code")
    assert "You are LocalMind, a software engineering assistant focused on correct, maintainable, production-grade solutions" in coder_prompt

    # 3. Test Gen-Z
    genz_prompt = get_localmind_system_instruction_with_personality("genz")
    assert "voice of a sharp, funny Gen-Z friend" in genz_prompt

    # 4. Test Researcher
    researcher_prompt = get_localmind_system_instruction_with_personality("research")
    assert "a research and knowledge-synthesis assistant" in researcher_prompt

