import sys
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:12345@localhost/warehouse_db"

def run_migration():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Connecting to database...")
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='inspection' AND column_name='ins_passed_date';
        """))
        exists = result.fetchone()
        
        if not exists:
            print("Adding column 'ins_passed_date' to table 'inspection'...")
            conn.execute(text("ALTER TABLE inspection ADD COLUMN ins_passed_date VARCHAR;"))
            conn.commit()
            print("Column 'ins_passed_date' added successfully.")
        else:
            print("Column 'ins_passed_date' already exists in 'inspection' table.")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
