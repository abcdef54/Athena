import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from langchain_core.runnables import RunnableConfig
from langchain.messages import AIMessage, HumanMessage

from src.backend.agents.middlewares import re_evaluate_answer
from src.backend.agents.tools import retrieve_context, fetch_web_page, read_emails

pytestmark = pytest.mark.asyncio

async def test_re_evaluate_answer_middleware_no_deep_think():
    # If deep_think is False, it should do nothing and return None
    state = {"messages": [AIMessage(content="Initial Draft")]}
    runtime = {"configurable": {"deep_think": False}}
    
    res = await re_evaluate_answer.aafter_model(state, runtime)
    assert res is None
    assert state["messages"][0].content == "Initial Draft"


async def test_re_evaluate_answer_middleware_with_deep_think():
    # Setup mock state and runtime with deep_think = True
    state = {
        "messages": [
            HumanMessage(content="Explain quantum computing."),
            AIMessage(content="Initial raw draft explanation.")
        ]
    }
    runtime = {"configurable": {"deep_think": True}}

    # Mock LLM invoke response
    refined_mock_res = MagicMock()
    refined_mock_res.content = "Critiqued and Refined Production-Grade Explanation"
    
    with patch("langchain_google_genai.ChatGoogleGenerativeAI.ainvoke", AsyncMock(return_value=refined_mock_res)) as mock_llm_invoke:
        res = await re_evaluate_answer.aafter_model(state, runtime)
        assert res is None
        # The last message should have been refined
        assert state["messages"][-1].content == "Critiqued and Refined Production-Grade Explanation"
        mock_llm_invoke.assert_called_once()


async def test_tool_retrieve_context():
    # Mock return values for vector search in tools test
    mock_doc = MagicMock()
    mock_doc.metadata = {"source": "quantum_computing.pdf"}
    mock_doc.page_content = "Quantum computing uses qubits instead of bits."
    
    from tests.conftest import mock_vector_store
    mock_vector_store.similarity_search_by_vector = MagicMock(return_value=[mock_doc])
    
    config = {"configurable": {"user_id": "test-user-id"}}
    serialized_text, docs = await retrieve_context.coroutine(
        query="What is quantum computing?",
        k_returns=1,
        runnable_config=config
    )
    
    assert "Source: quantum_computing.pdf" in serialized_text
    assert "Quantum computing uses qubits" in serialized_text
    assert len(docs) == 1
    assert docs[0].page_content == "Quantum computing uses qubits instead of bits."


async def test_tool_fetch_web_page():
    # Mock httpx response HTML
    mock_html = "<html><body><main><article><h2>Web Title</h2><p>This is extracted body content.</p></article></main></body></html>"
    
    mock_response = MagicMock()
    mock_response.text = mock_html
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()

    # Mock httpx AsyncClient
    with patch("httpx.AsyncClient.get", AsyncMock(return_value=mock_response)):
        res_text = await fetch_web_page.ainvoke({"url": "https://example.com/quantum"})
        assert "This is extracted body content" in res_text
        assert "Web Title" in res_text


async def test_tool_read_emails():
    # Call Gmail read tool. The backend uses the mocked global build method from conftest.py
    with patch("src.backend.agents.tools.get_google_credentials", AsyncMock()):
        emails_summary = await read_emails.ainvoke({"query": "from:sender@test.com", "num_read": 1, "user_id": "test-user-uuid"})
        assert "FROM: sender@test.com" in emails_summary
        assert "SUBJECT: Test Subject" in emails_summary
        assert "SUMMARY: mock email body" in emails_summary
