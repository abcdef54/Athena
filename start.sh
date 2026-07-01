#!/bin/bash

# Default fallback values
CONTEXT_LENGTH=32
PORT=18000

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -c|--context-length)
      CONTEXT_LENGTH="$2"
      shift 2
      ;;
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

echo "Starting LocalMind Docker Containers..."
echo "----------------------------------------"
echo "Context Length  : ${CONTEXT_LENGTH}K tokens"
echo "llama-swap Port : ${PORT}"
echo "----------------------------------------"

# Expose environment variables to Docker Compose
export DEFAULT_CONTEXT_LENGTH_K="$CONTEXT_LENGTH"
export LLAMA_SWAP_PORT="$PORT"

# Use docker-compose if available, otherwise fallback to docker compose
if command -v docker-compose &> /dev/null; then
  docker-compose up --build -d
else
  docker compose up --build -d
fi
