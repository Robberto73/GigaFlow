from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # LLM Provider: "gigachat" | "local_openai" | "auto"
    llm_provider: str = "local_openai"

    # GigaChat
    gigachat_credentials: str = ""
    gigachat_scope: str = "GIGACHAT_API_PERS"
    gigachat_model: str = "GigaChat-2-Max"
    gigachat_verify_ssl: bool = False
    gigachat_base_url: str = "https://gigachat.devices.sberbank.ru/api/v1"

    # Local OpenAI-compatible (LM Studio, Ollama, etc.)
    local_base_url: str = "http://127.0.0.1:5000/v1"
    local_api_key: str = "not-needed"
    local_model: str = "moonshotai_kimi-linear-48b-a3b-instruct"
    local_temperature: float = 0.3
    local_max_tokens: int = 4096

    # BGE — load ONLY from local ./bge-m3 folder
    bge_model: str = "./bge-m3"
    bge_device: str = "cuda"

    # RAG
    rag_chunk_size: int = 512
    rag_chunk_overlap: int = 64
    rag_top_k: int = 5
    rag_storage_path: str = "./rag_storage"

    # Tools
    tools_library_path: str = "./tools_library"

    # Server
    host: str = "127.0.0.1"
    port: int = 8000

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
