@echo off
setlocal enabledelayedexpansion

:: Default fallback values
set CONTEXT_LENGTH=32
set PORT=18000

:parse
if "%~1"=="" goto run
if "%~1"=="-c" (
    set CONTEXT_LENGTH=%~2
    shift
    shift
    goto parse
)
if "%~1"=="--context-length" (
    set CONTEXT_LENGTH=%~2
    shift
    shift
    goto parse
)
if "%~1"=="-p" (
    set PORT=%~2
    shift
    shift
    goto parse
)
if "%~1"=="--port" (
    set PORT=%~2
    shift
    shift
    goto parse
)
shift
goto parse

:run
echo Starting LocalMind Docker Containers...
echo ----------------------------------------
echo Context Length  : !CONTEXT_LENGTH!K tokens
echo llama-swap Port : !PORT!
echo ----------------------------------------

:: Expose environment variables to Docker Compose
set DEFAULT_CONTEXT_LENGTH_K=!CONTEXT_LENGTH!
set LLAMA_SWAP_PORT=!PORT!

docker-compose up --build -d
