import os
import json
from datetime import date
from pathlib import Path

path = Path(os.path.abspath(__file__))
SYSTEM_PROMPT_PATH = path.parent

def get_localmind_system_instruction_with_personality(personality: str) -> str:
    path = os.path.join(SYSTEM_PROMPT_PATH, 'system_instructions.json')
    with open(path, 'r', encoding='utf-8') as f:
        personalities = json.load(f)
    
    prompt = personalities[personality].replace("{current_date_str}", date.today().isoformat())
    return prompt