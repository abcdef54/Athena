import os
import dotenv

from typing import Any, Optional, Dict
from langchain.messages import HumanMessage
from langchain.agents.middleware import ModelFallbackMiddleware, PIIMiddleware, HumanInTheLoopMiddleware, after_model, AgentMiddleware
from langchain_core.runnables import RunnableConfig

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

class ReEvaluateAnswerMiddleware(AgentMiddleware):
    async def aafter_model(self, state: dict, runtime: Any, config: RunnableConfig = None) -> Optional[dict]:
        """
        Deep Reasoning Mode Middleware:
        Intercepts the initial generated draft, critiques it for logical alignment,
        corrects potential hallucinations or programming formatting issues, and outputs a refined version.
        """
        print(f'[DEBUG] Calling re_evaluate_answer middleware')
        if not config:
            try:
                from langgraph.config import get_config
                config = get_config()
            except Exception as e:
                print(f"[DEBUG] Could not get config via get_config: {e}")
                config = None

        if not config:
            config = getattr(runtime, "config", None) or getattr(runtime, "runnable_config", None)
            if not config and isinstance(runtime, dict):
                config = runtime
            
        configurable = config.get('configurable', {}) if config else {}
        deep_think = configurable.get('deep_think', False) 
        
        if not deep_think:
            print(f'[DEBUG] Deep think disabled, returning None')
            return None

        messages = state.get("messages", []) 
        if not messages:
            print(f'[DEBUG] No messages found (1), returning None')
            return None
            
        last_message = messages[-1] 
        
        def safe_get_msg_info(msg: Any) -> tuple[Optional[str], Optional[str]]:
            if isinstance(msg, dict):
                m_type = msg.get("role") or msg.get("type")
                m_content = msg.get("content")
            else:
                m_type = getattr(msg, "type", None)
                m_content = getattr(msg, "content", None)
            return m_type, m_content

        msg_type, msg_content = safe_get_msg_info(last_message)
        
        if msg_type not in ["ai", "assistant"] or not msg_content:
            print(f'[DEBUG] No AI messages found or empty content, returning None')
            return None
    
        print("[Deep Think Mode Activated] Critiquing initial agent output layout...") 
    
        user_prompt = "" 
        for msg in reversed(messages[:-1]):
            m_role, m_content = safe_get_msg_info(msg)
            
            if m_role in ["human", "user"]:
                user_prompt = m_content
                break
    
        print(f'[DEBUG] USER PROMTP: {user_prompt}')
        print(f'[DEBUG] ORIGINAL AGENT RESPONSE: {msg_content}')
    
        critique_prompt = f"""
        For development testing purposes, ALWAYS append your answer with "[DEEP THINK: REFINED]" to verify your answer has been refined.
        OR [DEEP THINK: UNCHANGED] if you agree that the original response is already perfect.
    
        You are Athena's Deep Reasoning and Quality Assurance Layer.
    
        Your job is NOT to automatically rewrite answers.
    
        Your job is to determine whether the answer genuinely needs improvement.
    
        ==================================================
        USER REQUEST
        ==================================================
    
        {user_prompt}
    
        ==================================================
        INITIAL DRAFT ANSWER
        ==================================================
    
        {msg_content}
    
        ==================================================
        REVIEW PROCESS
        ==================================================
    
        Perform a rigorous review.
    
        1. REQUIREMENT ALIGNMENT
    
        Ask:
    
        - Did the answer actually address the user's request?
        - Did it solve the requested problem?
        - Did it answer the correct question?
        - Is anything important missing?
    
        2. FACTUAL ACCURACY
    
        Look for:
    
        - Incorrect claims
        - Contradictions
        - Unsupported statements
        - Hallucinated information
        - Fabricated citations
        - Invented APIs
        - Invented framework behavior
        - Invented documentation references
    
        3. LOGICAL CONSISTENCY
    
        Check:
    
        - Internal contradictions
        - Invalid reasoning
        - Broken assumptions
        - Missing reasoning steps
    
        4. TECHNICAL REVIEW
    
        If the answer contains code:
    
        Check:
    
        - Syntax correctness
        - Missing imports
        - Runtime errors
        - Edge cases
        - Security issues
        - Scalability concerns
        - Best-practice violations
    
        Do not invent issues that do not exist.
    
        5. COMMUNICATION QUALITY
    
        Check:
    
        - Clarity
        - Structure
        - Conciseness
        - Readability
    
        Do not make answers longer unless doing so genuinely improves quality.
    
        6. COMPLETENESS
    
        Ask:
    
        - What critical information is missing?
        - What follow-up questions would a knowledgeable expert ask?
        - Would the user likely need additional clarification?
    
        ==================================================
        DECISION
        ==================================================
    
        If the answer is already excellent:
    
        Return it EXACTLY unchanged.
    
        If improvements are required:
    
        Rewrite the entire answer.
    
        Requirements:
    
        - Preserve correctness.
        - Improve accuracy.
        - Improve clarity.
        - Improve completeness.
        - Improve reasoning.
        - Preserve markdown formatting.
        - Preserve code blocks.
    
        Never include:
    
        - Review notes
        - Criticism
        - Meta-commentary
        - Explanations of your reasoning
    
        Return ONLY the final answer.
        """
    
        try:
            refined_response = await llm.ainvoke([HumanMessage(content=critique_prompt)])
    
            print(f'[DEBUG] REFINED ANSWER: {refined_response.content}') 
            
            if hasattr(last_message, "content"):
                last_message.content = refined_response.content 
            else:
                last_message["content"] = refined_response.content
                
            return None
        except Exception as e:
            print(f"Deep reasoning critique layer faulted: {str(e)}. Falling back to initial draft.") 
        return None

re_evaluate_answer = ReEvaluateAnswerMiddleware()