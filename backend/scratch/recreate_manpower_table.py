import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.database.db import engine

def drop_table():
    try:
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS man_power_worker CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS man_power CASCADE;"))
            try:
                conn.commit()
            except Exception:
                pass
        print("Successfully dropped old man_power and man_power_worker tables. SQLAlchemy will recreate them on uvicorn reload.")
    except Exception as e:
        print("Failed to drop table:", e)

if __name__ == "__main__":
    drop_table()
