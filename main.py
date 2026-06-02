import uvicorn

if __name__ == "__main__":
    uvicorn.run(app="src.backend.app:app", host="0.0.0.0", reload=True, reload_dirs=["src/backend"], port=8000)