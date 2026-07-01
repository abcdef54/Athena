

MAX_RANK_GROUP = 3



# Tournament ranking uses ODD widths (1/3/5/7) so each round ranks floor(n/3) groups of 3 and byes
# the trailing n%3, dropping the survivor count straight to <=3 (e.g. 5->[3]+2 byes, 7->[3,3]+1 bye,
# 9->[3,3,3]).
TOURNAMENT_MODE_CONFIG = {
    "low":    1,   # width 1 -> 0 ranking calls
    "medium": 3,   # [3] one-shot (1 call)
    "high":   5,   # [3] + 2 byes, then 3-way final (2 calls)
    "extra":    7,   # [3,3] + 1 bye, then 3-way final (3 calls)
}


def get_config(mode: str) -> int:
    return TOURNAMENT_MODE_CONFIG[mode]