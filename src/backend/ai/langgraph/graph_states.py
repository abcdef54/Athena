from uuid import uuid4
from pydantic import BaseModel, Field
from typing import TypedDict, Annotated, Literal, Optional, Any
from langgraph.graph.message import AnyMessage, add_messages

class Candidate(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex)  # stable identity for logging
    answer: str = ""
    messages: list[Any] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)


class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    user_query: str

    reasoning_mode: Literal[
        "low",
        "medium",
        "high",
        "extra"
    ]

    width: int
    pool: list[Candidate]

    final_answer: Optional[str]
    sampled_answers: list[str]
    citations: list[str]

    rank_latency: float
    rank_calls: int
    winner_candidate_id: Optional[str]
    rank_parse_failed: bool

    tournament_rounds: int
    tournament_rank_calls: int
    tournament_max_group_size: int
