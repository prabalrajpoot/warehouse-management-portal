import psycopg2

conn = psycopg2.connect('postgresql://postgres:12345@localhost/warehouse_db')
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE dispatch_return ADD COLUMN set_type VARCHAR;")
    print("Added set_type column to dispatch_return successfully!")
except Exception as e:
    print("Column set_type might already exist or error:", e)
    conn.rollback()

try:
    cur.execute("ALTER TABLE dispatch_return ADD COLUMN quantity INTEGER DEFAULT 1;")
    print("Added quantity column to dispatch_return successfully!")
except Exception as e:
    print("Column quantity might already exist or error:", e)
    conn.rollback()

conn.commit()
cur.close()
conn.close()
print("Migration of dispatch_return fields complete!")
