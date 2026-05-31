import os
import dotenv

from typing import Any, Optional, Dict
from langchain.messages import HumanMessage
from langchain.agents.middleware import ModelFallbackMiddleware, PIIMiddleware, HumanInTheLoopMiddleware, after_model

from .config import llm

dotenv.load_dotenv()

FALLBACK_MODELS = os.getenv('GOOGLE_GENEATIVE_AI_FALLBACK_MODELS').split(",")



fallback_models = ModelFallbackMiddleware(*FALLBACK_MODELS)

# file_system_search = FilesystemFileSearchMiddleware(root_path='./', use_ripgrep=True)

pii_detection = PIIMiddleware(pii_type='credit_card', strategy='redact', apply_to_input=True)

human_in_the_loop = HumanInTheLoopMiddleware(
    interrupt_on={
        "read_emails": True
    },
    description_prefix="Tool execution pending approval"
)

@after_model
async def re_evaluate_answer(state: dict, runtime: Any) -> Optional[dict]:
    """
    Deep Reasoning Mode Middleware:
    Intercepts the initial generated draft, critiques it for logical alignment,
    corrects potential hallucinations or programming formatting issues, and outputs a refined version.
    """
    config = getattr(runtime, "config", None) or getattr(runtime, "runnable_config", None)
    
    if not config and isinstance(runtime, dict):
        config = runtime
        
    configurable = config.get('configurable', {}) if config else {}
    deep_think = configurable.get('deep_think', False) 
    
    if not deep_think:
        return None

    messages = state.get("messages", []) 
    if not messages:
        return None
        
    last_message = messages[-1] 
    
    msg_type = getattr(last_message, "type", None) or last_message.get("role") or last_message.get("type")
    msg_content = getattr(last_message, "content", None) or last_message.get("content") 
    
    if msg_type not in ["ai", "assistant"] or not msg_content:
        return None

    print("[Deep Think Mode Activated] Critiquing initial agent output layout...") 

    user_prompt = "" 
    for msg in reversed(messages[:-1]):
        m_role = getattr(msg, "type", None) or msg.get("role") or msg.get("type")
        m_content = getattr(msg, "content", None) or msg.get("content")
        
        if m_role in ["human", "user"]:
            user_prompt = m_content
            break

    critique_prompt = f"""
    You are the deep-reasoning verification layer for Athena, a world-class analytical assistant.
    Review the initial draft answer generated for the user's prompt. 
    Analyze it for flaws, missing code block documentation, structure clarity, and completeness.

    CRITERIA FOR REVISION:
    - If the answer is completely accurate, concise, and beautifully structured, do not add filler; return it exactly as-is.
    - If you find incomplete code logic, ambiguous formatting, or subtle errors, completely rewrite it to match production quality.
    - Ensure markdown layouts, headers, and code snippets are cleanly preserved.

    USER ORIGINAL PROMPT:
    {user_prompt}

    INITIAL GENERATED DRAFT ANSWER:
    ---
    {msg_content}
    ---

    Provide the final optimized and validated response below without any meta-commentary:
    """ 

    try:
        refined_response = await llm.ainvoke([HumanMessage(content=critique_prompt)]) 
        
        if hasattr(last_message, "content"):
            last_message.content = refined_response.content 
        else:
            last_message["content"] = refined_response.content
            
        return None
    except Exception as e:
        print(f"Deep reasoning critique layer faulted: {str(e)}. Falling back to initial draft.") 
        return None