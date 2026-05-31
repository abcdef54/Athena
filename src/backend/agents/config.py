import os
import dotenv
import asyncio

from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader
)

dotenv.load_dotenv()
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")

EMBEDDING_MODEL_NAME = os.getenv('GOOGLE_EMBEDDING_MODEL_NAME')
GENERATIVE_MODEL_NAME = os.getenv('GOOGLE_GENERATIVE_AI_MODEL_NAME')

llm = ChatGoogleGenerativeAI(
    model=GENERATIVE_MODEL_NAME,
    temperature=0.1,

)

query_embedding_model = GoogleGenerativeAIEmbeddings(
    model=EMBEDDING_MODEL_NAME,
    output_dimensionality=3072,
    task_type='RETRIEVAL_QUERY'
)

document_embedding_model = GoogleGenerativeAIEmbeddings(
    model=EMBEDDING_MODEL_NAME,
    output_dimensionality=3072,
    task_type='RETRIEVAL_DOCUMENT'
)

def _get_user_vector_store(user_id: str) -> Chroma:
    user_db_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), f'../../../uploads/chroma/{user_id}')
    )
    os.makedirs(user_db_path, exist_ok=True)
    return Chroma(
        embedding_function=document_embedding_model,
        persist_directory=user_db_path
    )

def _extract_and_split_docs(file_path: str, file_type: str, text_splitter: RecursiveCharacterTextSplitter) -> list:
    """Synchronous file parser running inside a thread pool worker."""
    if file_type == 'pdf':
        loader = PyPDFLoader(file_path)
    elif file_type == 'docx':
        loader = Docx2txtLoader(file_path)
    elif file_type in ['md', 'txt']:
        loader = TextLoader(file_path, encoding="utf-8")
    else:
        raise ValueError(f"Unsupported file format extension: .{file_type}")
        
    return text_splitter.split_documents(loader.load())


async def ingest_docs(
    file_path: str,
    attachment_id: str,
    chunk_size: int,
    chunk_overlap: int,
    user_id: str
):
    """Processes a locally accessible file directly into the user's isolated vector store."""
    print(f"\n[DEBUG ingest_docs] Starting document ingestion...")
    print(f"  - file_path: {file_path}")
    print(f"  - attachment_id: {attachment_id}")
    print(f"  - chunk_size: {chunk_size}")
    print(f"  - user_id: {user_id}")

    loop = asyncio.get_running_loop()
    file_type = os.path.splitext(file_path)[-1].replace(".", "").lower()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        add_start_index=True
    )

    try:
        print("[DEBUG ingest_docs] Splitting documents and opening Chroma...")
        chunks, vector_store = await asyncio.gather(
            loop.run_in_executor(None, _extract_and_split_docs, file_path, file_type, text_splitter),
            loop.run_in_executor(None, _get_user_vector_store, user_id)
        )
        print(f"[DEBUG ingest_docs] Document split completed. Generated {len(chunks)} chunks.")
        print(f"[DEBUG ingest_docs] Vector store loaded. Path: {vector_store._persist_directory if hasattr(vector_store, '_persist_directory') else 'Unknown'}")
        
        if not chunks:
            print("[DEBUG ingest_docs] WARNING: No chunks generated. Skipping vector store additions.")
            return
        
        for chunk in chunks:
            chunk.metadata["source_file_id"] = attachment_id

        print(f"[DEBUG ingest_docs] Adding {len(chunks)} chunks to vector store...")
        await loop.run_in_executor(None, lambda c: vector_store.add_documents(c, chunk_size=50), chunks)
        print("[DEBUG ingest_docs] Document chunks successfully added to Chroma DB.")

    except Exception as e:
        import traceback
        print(f"[DEBUG ingest_docs] EXCEPTION during document ingestion:")
        traceback.print_exc()
        raise e