import psycopg2

conn = psycopg2.connect('postgresql://postgres:12345@localhost/warehouse_db')
cur = conn.cursor()

create_table_sql = """
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    mapped_districts VARCHAR,
    state VARCHAR
);
"""

cur.execute(create_table_sql)
conn.commit()

# Seed initial warehouses if table is empty
cur.execute("SELECT COUNT(*) FROM warehouses;")
count = cur.fetchone()[0]  # type: ignore

if count == 0:
    warehouses_seed = [
        ("Bangalore Warehouse", "Dakshina Kannada, Ramanagara, Mysuru, Mandya, Bangalore, Bangalore Rural", "Karnataka"),
        ("Guwahati Warehouse", "Kamrup, Kamrup Metropolitan, Jorhat, Dibrugarh", "Assam"),
        ("Guwahati - Addl", "Barpeta, Nalbari, Bongaigaon", "Assam"),
        ("Ahmedabad Warehouse", "Ahmedabad, Gandhinagar, Vadodara, Surat", "Gujarat"),
        ("New Ahmedabad Warehouse", "Rajkot, Jamnagar, Bhavnagar, Junagadh", "Gujarat"),
        ("Bhubaneswar Warehouse", "Khurda, Cuttack, Puri, Ganjam", "Odisha"),
        ("Chennai Warehouse", "Chennai, Kanchipuram, Thiruvallur, Coimbatore", "Tamil Nadu"),
        ("Hapur - Master Warehouse", "Hapur, Ghaziabad, Meerut, Noida", "Uttar Pradesh"),
        ("Jaipur Warehouse", "Jaipur, Jodhpur, Udaipur, Kota", "Rajasthan"),
        ("Noida Warehouse", "Gautam Buddha Nagar, Bulandshahr, Aligarh", "Uttar Pradesh")
    ]
    for name, districts, state in warehouses_seed:
        cur.execute(
            "INSERT INTO warehouses (name, mapped_districts, state) VALUES (%s, %s, %s);",
            (name, districts, state)
        )
    conn.commit()
    print("Seeded initial warehouses successfully!")

cur.close()
conn.close()
print("Warehouse table migration complete!")
