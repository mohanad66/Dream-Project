import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import sys
# Configuration
SQLITE_DB = './db.sqlite3'  # UPDATE THIS PATH

# Railway PostgreSQL connection - Using PUBLIC connection details
POSTGRES_CONFIG = {
    'host': 'maglev.proxy.rlwy.net',
    'database': 'railway',
    'user': 'postgres',
    'password': 'kzXKIBXKuJzFowdfxDQdQlTKVExgsbBb',
    'port': 18551
}

# Or use DATABASE_PUBLIC_URL directly:
DATABASE_PUBLIC_URL = 'postgresql://postgres:kzXKIBXKuJzFowdfxDQdQlTKVExgsbBb@crossover.proxy.rlwy.net:49225/railway'


def map_sqlite_type_to_postgres(sqlite_type):
    """Map SQLite data types to PostgreSQL data types"""
    sqlite_type = sqlite_type.upper()
    
    if 'INT' in sqlite_type:
        return 'INTEGER'
    elif 'CHAR' in sqlite_type or 'TEXT' in sqlite_type or 'CLOB' in sqlite_type:
        return 'TEXT'
    elif 'REAL' in sqlite_type or 'FLOA' in sqlite_type or 'DOUB' in sqlite_type:
        return 'REAL'
    elif 'BLOB' in sqlite_type:
        return 'BYTEA'
    elif 'BOOL' in sqlite_type:
        return 'BOOLEAN'
    elif 'DATE' in sqlite_type or 'TIME' in sqlite_type:
        return 'TIMESTAMP'
    else:
        return 'TEXT'


def migrate_database():
    """Main migration function"""
    print("Starting migration from SQLite to PostgreSQL...")
    
    # Connect to SQLite
    try:
        sqlite_conn = sqlite3.connect(SQLITE_DB)
        sqlite_cursor = sqlite_conn.cursor()
        print(f"✓ Connected to SQLite database: {SQLITE_DB}")
    except Exception as e:
        print(f"✗ Error connecting to SQLite: {e}")
        sys.exit(1)
    
    # Connect to PostgreSQL
    try:
        pg_conn = psycopg2.connect(**POSTGRES_CONFIG)
        pg_cursor = pg_conn.cursor()
        print(f"✓ Connected to PostgreSQL on Railway")
    except Exception as e:
        print(f"✗ Error connecting to PostgreSQL: {e}")
        sys.exit(1)
    
    # Get all tables from SQLite
    sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = sqlite_cursor.fetchall()
    
    if not tables:
        print("No tables found in SQLite database")
        return
    
    print(f"\nFound {len(tables)} tables to migrate")
    
    for table_tuple in tables:
        table_name = table_tuple[0]
        print(f"\n--- Migrating table: {table_name} ---")
        
        try:
            # Get table schema
            sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
            columns = sqlite_cursor.fetchall()
            
            # Build CREATE TABLE statement for PostgreSQL
            column_defs = []
            primary_keys = []
            
            for col in columns:
                col_id = col[0]
                col_name = col[1]
                col_type = col[2]
                not_null = col[3]
                default_val = col[4]
                is_pk = col[5]
                
                pg_type = map_sqlite_type_to_postgres(col_type)
                
                # Build column definition
                col_def = f'"{col_name}" {pg_type}'
                
                if not_null and not is_pk:
                    col_def += ' NOT NULL'
                
                if default_val is not None:
                    col_def += f" DEFAULT '{default_val}'"
                
                column_defs.append(col_def)
                
                if is_pk:
                    primary_keys.append(col_name)
            
            # Add primary key constraint
            if primary_keys:
                pk_constraint = f"PRIMARY KEY ({', '.join([f'\"{pk}\"' for pk in primary_keys])})"
                column_defs.append(pk_constraint)
            
            # Drop table if exists and create new one
            drop_table = f'DROP TABLE IF EXISTS "{table_name}" CASCADE'
            pg_cursor.execute(drop_table)
            
            create_table = f'CREATE TABLE "{table_name}" ({", ".join(column_defs)})'
            pg_cursor.execute(create_table)
            print(f"  ✓ Created table structure")
            
            # Get all data from SQLite table
            sqlite_cursor.execute(f'SELECT * FROM "{table_name}"')
            rows = sqlite_cursor.fetchall()
            
            if rows:
                # Get column names
                column_names = [col[1] for col in columns]
                
                # Prepare insert query
                placeholders = ', '.join(['%s'] * len(column_names))
                column_list = ', '.join([f'"{col}"' for col in column_names])
                insert_query = f'INSERT INTO "{table_name}" ({column_list}) VALUES ({placeholders})'
                
                # Insert data in batches
                batch_size = 1000
                for i in range(0, len(rows), batch_size):
                    batch = rows[i:i + batch_size]
                    pg_cursor.executemany(insert_query, batch)
                
                pg_conn.commit()
                print(f"  ✓ Migrated {len(rows)} rows")
            else:
                print(f"  ⚠ Table is empty")
            
        except Exception as e:
            print(f"  ✗ Error migrating table {table_name}: {e}")
            pg_conn.rollback()
            continue
    
    # Close connections
    sqlite_cursor.close()
    sqlite_conn.close()
    pg_cursor.close()
    pg_conn.close()
    
    print("\n" + "="*50)
    print("Migration completed successfully!")
    print("="*50)


if __name__ == "__main__":
    # Verify configuration before running
    print("="*50)
    print("SQLite to PostgreSQL Migration")
    print("="*50)
    print(f"\nSQLite Database: {SQLITE_DB}")
    print(f"PostgreSQL Host: {POSTGRES_CONFIG['host']}")
    print(f"PostgreSQL Database: {POSTGRES_CONFIG['database']}")
    
    response = input("\nProceed with migration? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        migrate_database()
    else:
        print("Migration cancelled")