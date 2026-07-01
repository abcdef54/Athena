import os
import asyncio

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter, Language
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader
)
from src.backend import constants as CONST

_embeddings_instance = None

class LocalMindVectorDB:
    """
    Unified Knowledge and Vector Storage Layer for LocalMind.
    Encapsulates all ingestion, retrieval, and deletion logic.
    """
    
    CODE_LANGUAGES = {
        'py': Language.PYTHON,
        'cpp': Language.CPP,
        'c': Language.CPP,
        'js': Language.JS,
        'ts': Language.TS,
        'html': Language.HTML
    }

    def __init__(self) -> None:
        global _embeddings_instance
        if _embeddings_instance is None:
            _embeddings_instance = HuggingFaceEmbeddings(
                model_name='sentence-transformers/all-MiniLM-L6-v2',
                encode_kwargs={'normalize_embeddings': True}
            )
        self._embeddings = _embeddings_instance

        self._vector_store = Chroma(
            embedding_function=self._embeddings,
            persist_directory=str(CONST.VECTOR_DB_PERSIST_DIR)
        )

    def _extract_and_split_docs(self, file_path: str, file_type: str, chunk_size: int, chunk_overlap: int) -> list:
        """Synchronous file parser running inside a thread pool worker."""
        if file_type == 'pdf':
            loader = PyPDFLoader(file_path)
        elif file_type == 'docx':
            loader = Docx2txtLoader(file_path)
        elif file_type in ['md', 'txt', 'css'] or file_type in self.CODE_LANGUAGES:
            loader = TextLoader(file_path, encoding="utf-8")
        else:
            raise ValueError(f"Unsupported file format extension: .{file_type}")
            
        if file_type in self.CODE_LANGUAGES:
            splitter = RecursiveCharacterTextSplitter.from_language(
                language=self.CODE_LANGUAGES[file_type],
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                add_start_index=True
            )
        else:
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                add_start_index=True
            )
            
        return splitter.split_documents(loader.load())

    async def ingest(self, file_path: str, attachment_id: str, chunk_size: int = 500, chunk_overlap: int = 50) -> None:
        """Processes a locally accessible file and embeds it directly into the store."""
        print(f"\n[Knowledge] Ingesting: {file_path} (ID: {attachment_id})")
        
        loop = asyncio.get_running_loop()
        file_type = os.path.splitext(file_path)[-1].replace(".", "").lower()

        try:
            chunks = await loop.run_in_executor(
                None, self._extract_and_split_docs, file_path, file_type, chunk_size, chunk_overlap
            )
            
            if not chunks:
                print("[Knowledge] WARNING: No chunks generated. Skipping store additions.")
                return
            
            for chunk in chunks:
                chunk.metadata["source_file_id"] = str(attachment_id)

            await loop.run_in_executor(None, self._vector_store.add_documents, chunks)
            print(f"[Knowledge] Successfully added {len(chunks)} chunks to Chroma.")

        except Exception as e:
            import traceback
            print("[Knowledge] EXCEPTION during ingestion:")
            traceback.print_exc()
            raise e

    async def query(self, text: str, n_results: int = 4, file_id_filter: str = None) -> list:
        """
        Retrieves context documents matching a query string.
        Optionally filters results to a specific file.
        """
        loop = asyncio.get_running_loop()
        
        search_filter = {"source_file_id": str(file_id_filter)} if file_id_filter else None
        
        docs = await loop.run_in_executor(
            None, 
            lambda: self._vector_store.similarity_search(text, k=n_results, filter=search_filter)
        )
        return docs

    async def delete_file(self, attachment_id: str) -> None:
        """Completely purges all document vector chunks associated with an attachment ID."""
        loop = asyncio.get_running_loop()
        
        print(f"[Knowledge] Purging all chunks for file ID: {attachment_id}")
        
        def sync_purge():
            collection = self._vector_store._collection
            results = collection.get(where={"source_file_id": str(attachment_id)})
            if results and results.get("ids"):
                collection.delete(ids=results["ids"])
                
        await loop.run_in_executor(None, sync_purge)
        print(f"[Knowledge] File chunks deleted successfully.")