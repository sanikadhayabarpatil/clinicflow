import sys
from pathlib import Path

# Ensure backend/app is importable in tests
sys.path.insert(0, str(Path(__file__).parent.parent))
