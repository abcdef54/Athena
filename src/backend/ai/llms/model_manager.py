import os
import asyncio
from src.backend.ai.llms import huggingface
from src.backend.constants import (DEFAULT_MODEL_REPO_ID,
                                 DEFAULT_MODEL_GGUF_FILE,
                                 LLAMA_SWAP_CONFIG_PATH,
                                 LLAMA_SWAP_PATH_PREFIX,
                                 DEFAULT_CONTEXT_LENGTH_K)

class LocalMindModelManager:
    def __init__(self) -> None:
        self.models_dir = huggingface.path

    async def browse_models(self, query: str | None = None, limit: int = 20):
        return await asyncio.to_thread(huggingface.browse_models, query, limit)

    async def list_quants(self, repo_id: str):
        return await asyncio.to_thread(huggingface.list_quants, repo_id)

    async def download_gguf(
        self,
        repo_id: str = DEFAULT_MODEL_REPO_ID,
        gguf_filename: str = DEFAULT_MODEL_GGUF_FILE
    ) -> str:
        return await asyncio.to_thread(huggingface.download_gguf, repo_id, gguf_filename)

    def _list_local_gguf_files_sync(self) -> list[dict]:
        if not os.path.exists(self.models_dir):
            return []
        
        files = []
        for filename in os.listdir(self.models_dir):
            if filename.endswith(".gguf"):
                if huggingface.is_secondary_split_part(filename):
                    continue
                full_path = os.path.join(self.models_dir, filename)
                if os.path.isfile(full_path):
                    files.append({
                        "filename": filename,
                        "local_path": full_path,
                        "size_bytes": os.path.getsize(full_path)
                    })
        return files

    async def list_local_gguf_files(self) -> list[dict]:
        """Scans the cpp_models/ directory for .gguf files asynchronously."""
        return await asyncio.to_thread(self._list_local_gguf_files_sync)

    def _delete_local_gguf_file_sync(self, local_path: str) -> None:
        if local_path and os.path.exists(local_path):
            filename = os.path.basename(local_path)
            dirname = os.path.dirname(local_path)
            
            import re
            m = re.search(r'^(.*)-(\d+)-of-(\d+)\.gguf$', filename, re.IGNORECASE)
            if m:
                prefix = m.group(1)
                total_parts = m.group(3)
                for f in os.listdir(dirname):
                    if re.match(re.escape(prefix) + r'-\d+-of-' + re.escape(total_parts) + r'\.gguf$', f, re.IGNORECASE):
                        path_to_del = os.path.join(dirname, f)
                        if os.path.exists(path_to_del):
                            os.remove(path_to_del)
            else:
                os.remove(local_path)

    async def delete_local_gguf_file(self, local_path: str) -> None:
        """Removes the GGUF file from disk asynchronously."""
        await asyncio.to_thread(self._delete_local_gguf_file_sync, local_path)

    def _build_llama_server_command(self, gguf_file: str) -> str:
        """Generates the startup command for the llama-server inside the container."""
        ctx_size = DEFAULT_CONTEXT_LENGTH_K * 1024
        return f"llama-server --port ${{PORT}} -m {LLAMA_SWAP_PATH_PREFIX}{gguf_file} -ngl 99 -c {ctx_size} --parallel 1 --flash-attn auto"

    def write_llama_swap_config(self, models: list[dict]) -> None:
        """Writes the llama-swap configuration file in YAML format."""
        yaml_lines = ["models:"]
        for m in models:
            model_name = m["model_name"]
            gguf_file = m["gguf_file"]
            cmd = self._build_llama_server_command(gguf_file)
            
            yaml_lines.append(f"  {model_name}:")
            yaml_lines.append(f'    cmd: "{cmd}"')
            yaml_lines.append(f"    proxy: http://127.0.0.1:${{PORT}}")
            yaml_lines.append("")
            
        yaml_content = "\n".join(yaml_lines)
        if os.path.exists(LLAMA_SWAP_CONFIG_PATH):
            try:
                with open(LLAMA_SWAP_CONFIG_PATH, "r", encoding="utf-8") as f:
                    if f.read() == yaml_content:
                        return
            except Exception:
                pass

        with open(LLAMA_SWAP_CONFIG_PATH, "w", encoding="utf-8") as f:
            f.write(yaml_content)