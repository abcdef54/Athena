from langgraph.graph import START, END, StateGraph
from langchain_core.runnables import RunnableConfig
from src.backend.ai.langgraph.graph_states import AgentState
from src.backend.ai.langgraph.graph_nodes import setup, generate, tournament_select
from src.backend.ai.system_prompt import get_localmind_system_instruction_with_personality

builder = StateGraph(AgentState)
builder.add_node("setup", setup)
builder.add_node("generate", generate)
builder.add_node("tournament_select", tournament_select)

builder.add_edge(START, "setup")
builder.add_edge("setup", "generate")
builder.add_edge('generate', 'tournament_select')
builder.add_edge("tournament_select", END)

GRAPH = builder.compile()

class LocalMindAI:
    def __init__(self) -> None:
        self._graph = GRAPH 
    
    async def chat(
        self,
        messages: list[dict[str, str]],
        model_name: str,
        personality: str,
        reasoning_mode: str,
        temperature: float,
        tools_enabled: bool = True
    ) -> dict:

        system_instruction = get_localmind_system_instruction_with_personality(personality)
        
        # Prepend the system prompt at the beginning of history, merging if summary is already present
        if messages and messages[0].get("role") == "system":
            merged_content = f"{system_instruction}\n\n{messages[0]['content']}"
            messages_with_system = [{"role": "system", "content": merged_content}] + messages[1:]
        else:
            messages_with_system = [{"role": "system", "content": system_instruction}] + messages

        init: AgentState = {
            'messages': messages_with_system,
        }

        config: RunnableConfig = {
            'configurable': {
                'model_name': model_name,
                'reasoning_mode': reasoning_mode,
                'temperature': temperature,
                'personality': personality,
                'tools_enabled': tools_enabled,
            }
        }

        state = await self._graph.ainvoke(init, config)
        return {
            'final_answer': state.get('final_answer', "An Error Occured While Generating Answer."),
            'citations': state.get('citations', [])
        }

    async def baseline_chat(
        self,
        messages,
        model_name: str,
    ) -> str:
        result = await self(messages, model_name, 'general', 'low', 0.0, tools_enabled=False)
        return result['final_answer']

    async def __call__(
        self,
        messages: list[dict[str, str]],
        model_name: str,
        personality: str,
        reasoning_mode: str,
        temperature: float,
        tools_enabled: bool = True
    ) -> dict:
        return await self.chat(
            messages, model_name, personality, reasoning_mode, temperature, tools_enabled
        )