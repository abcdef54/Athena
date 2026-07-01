import os
import argparse
from pathlib import Path

import uvicorn

ENV_PATH = Path(__file__).parent / ".env"

DEFAULT_ENV = """\
TAVILY_KEY=
LOCAL_LLM_URL=http://localhost:18000/v1
POSTGRESQL_URL=postgresql+asyncpg://postgres:admin@localhost:5432/localmind_db
LLAMA_SWAP_CONFIG_PATH=llama_swap_config.yaml
LLAMA_SWAP_PATH_PREFIX=/models/
DEFAULT_CONTEXT_LENGTH_K=32
"""


def ensure_env_file() -> None:
    """Create a default .env file if one does not exist."""
    if not ENV_PATH.exists():
        print("No .env file found.")
        ENV_PATH.write_text(DEFAULT_ENV, encoding="utf-8")
        print(f"Created default .env file at {ENV_PATH}")


if __name__ == "__main__":
    ensure_env_file()

    parser = argparse.ArgumentParser(description="Start LocalMind Backend Server")
    parser.add_argument("-c", "--context-length", type=int, help="Default context length in thousands of tokens (e.g. 16, 32)")
    parser.add_argument("-p", "--port", type=int, default=18000, help="Port that llama-swap runs on (default: 18000)")
    args, unknown = parser.parse_known_args()

    if args.context_length is not None:
        os.environ["DEFAULT_CONTEXT_LENGTH_K"] = str(args.context_length)

    if "LOCAL_LLM_URL" not in os.environ:
        os.environ["LOCAL_LLM_URL"] = f"http://localhost:{args.port}/v1"

    uvicorn.run(app="src.backend.app:app", host="0.0.0.0", reload=True, reload_dirs=["src/backend"], port=8000)
