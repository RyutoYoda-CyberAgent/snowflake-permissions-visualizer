#!/usr/bin/env python3
"""
Snowflake Permissions Fetcher
Retrieves role, user, and table permissions from Snowflake and exports as JSON
"""

import snowflake.connector
import json
import os
from datetime import datetime
from typing import Dict, List, Any

class SnowflakePermissionsFetcher:
    def __init__(self, connection_params: Dict[str, str]):
        self.connection_params = connection_params
        self.conn = None
    
    def connect(self):
        """Connect to Snowflake"""
        try:
            self.conn = snowflake.connector.connect(**self.connection_params)
            print("Connected to Snowflake successfully")
        except Exception as e:
            print(f"Error connecting to Snowflake: {e}")
            raise
    
    def disconnect(self):
        """Disconnect from Snowflake"""
        if self.conn:
            self.conn.close()
    
    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Execute query and return results as list of dictionaries"""
        cursor = self.conn.cursor()
        try:
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description]
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            return results
        finally:
            cursor.close()
    
    def get_roles(self) -> List[Dict[str, Any]]:
        """Get all roles"""
        query = "SHOW ROLES"
        return self.execute_query(query)
    
    def get_users(self) -> List[Dict[str, Any]]:
        """Get all users"""
        query = "SHOW USERS"
        return self.execute_query(query)
    
    def get_databases(self) -> List[Dict[str, Any]]:
        """Get all databases"""
        query = "SHOW DATABASES"
        return self.execute_query(query)
    
    def get_schemas(self, database: str) -> List[Dict[str, Any]]:
        """Get schemas for a database"""
        query = f"SHOW SCHEMAS IN DATABASE {database}"
        return self.execute_query(query)
    
    def get_tables(self, database: str, schema: str) -> List[Dict[str, Any]]:
        """Get tables for a schema"""
        query = f"SHOW TABLES IN SCHEMA {database}.{schema}"
        return self.execute_query(query)
    
    def get_grants_to_role(self, role: str) -> List[Dict[str, Any]]:
        """Get grants to a specific role"""
        query = f"SHOW GRANTS TO ROLE {role}"
        return self.execute_query(query)
    
    def get_grants_to_user(self, user: str) -> List[Dict[str, Any]]:
        """Get grants to a specific user"""
        query = f"SHOW GRANTS TO USER {user}"
        return self.execute_query(query)
    
    def get_grants_of_role(self, role: str) -> List[Dict[str, Any]]:
        """Get grants of a specific role (who has this role)"""
        query = f"SHOW GRANTS OF ROLE {role}"
        return self.execute_query(query)
    
    def get_table_grants(self, database: str, schema: str, table: str) -> List[Dict[str, Any]]:
        """Get grants on a specific table"""
        query = f"SHOW GRANTS ON TABLE {database}.{schema}.{table}"
        return self.execute_query(query)
    
    def fetch_all_permissions(self) -> Dict[str, Any]:
        """Fetch comprehensive permissions data"""
        permissions_data = {
            "timestamp": datetime.now().isoformat(),
            "roles": [],
            "users": [],
            "databases": [],
            "role_grants": {},
            "user_grants": {},
            "role_memberships": {},
            "table_grants": {}
        }
        
        # Get roles
        print("Fetching roles...")
        permissions_data["roles"] = self.get_roles()
        
        # Get users
        print("Fetching users...")
        permissions_data["users"] = self.get_users()
        
        # Get databases
        print("Fetching databases...")
        permissions_data["databases"] = self.get_databases()
        
        # Get role grants
        print("Fetching role grants...")
        for role_info in permissions_data["roles"]:
            role_name = role_info["name"]
            try:
                permissions_data["role_grants"][role_name] = self.get_grants_to_role(role_name)
                permissions_data["role_memberships"][role_name] = self.get_grants_of_role(role_name)
            except Exception as e:
                print(f"Error fetching grants for role {role_name}: {e}")
                permissions_data["role_grants"][role_name] = []
                permissions_data["role_memberships"][role_name] = []
        
        # Get user grants
        print("Fetching user grants...")
        for user_info in permissions_data["users"]:
            user_name = user_info["name"]
            try:
                permissions_data["user_grants"][user_name] = self.get_grants_to_user(user_name)
            except Exception as e:
                print(f"Error fetching grants for user {user_name}: {e}")
                permissions_data["user_grants"][user_name] = []
        
        # Get table grants for a sample of tables
        print("Fetching table grants...")
        table_count = 0
        for db_info in permissions_data["databases"][:5]:  # Limit to first 5 databases
            db_name = db_info["name"]
            try:
                schemas = self.get_schemas(db_name)
                for schema_info in schemas[:3]:  # Limit to first 3 schemas per database
                    schema_name = schema_info["name"]
                    try:
                        tables = self.get_tables(db_name, schema_name)
                        for table_info in tables[:10]:  # Limit to first 10 tables per schema
                            table_name = table_info["name"]
                            table_key = f"{db_name}.{schema_name}.{table_name}"
                            try:
                                permissions_data["table_grants"][table_key] = self.get_table_grants(db_name, schema_name, table_name)
                                table_count += 1
                                if table_count >= 50:  # Limit total tables to prevent long execution
                                    break
                            except Exception as e:
                                print(f"Error fetching grants for table {table_key}: {e}")
                        if table_count >= 50:
                            break
                    except Exception as e:
                        print(f"Error fetching tables for schema {db_name}.{schema_name}: {e}")
                if table_count >= 50:
                    break
            except Exception as e:
                print(f"Error fetching schemas for database {db_name}: {e}")
        
        return permissions_data

def main():
    # Configuration - all values from environment variables
    connection_params = {
        'user': os.getenv('SNOWFLAKE_USER'),
        'account': os.getenv('SNOWFLAKE_ACCOUNT'),
        'warehouse': os.getenv('SNOWFLAKE_WAREHOUSE', 'COMPUTE_WH'),
        'database': os.getenv('SNOWFLAKE_DATABASE', 'SNOWFLAKE'),
        'schema': os.getenv('SNOWFLAKE_SCHEMA', 'INFORMATION_SCHEMA'),
        'role': os.getenv('SNOWFLAKE_ROLE', 'ACCOUNTADMIN'),
        'authenticator': os.getenv('SNOWFLAKE_AUTHENTICATOR', 'externalbrowser')
    }
    
    # Validate required parameters
    if not connection_params['user']:
        raise ValueError("SNOWFLAKE_USER environment variable is required")
    if not connection_params['account']:
        raise ValueError("SNOWFLAKE_ACCOUNT environment variable is required")
    
    # Add password or private key based on authentication method
    if connection_params['authenticator'] == 'externalbrowser':
        # External browser authentication - no password needed
        pass
    elif connection_params['authenticator'] == 'jwt':
        # JWT authentication - requires private key
        private_key = os.getenv('SNOWFLAKE_PRIVATE_KEY')
        if not private_key:
            raise ValueError("SNOWFLAKE_PRIVATE_KEY environment variable is required for JWT auth")
        connection_params['private_key'] = private_key
    elif connection_params['authenticator'] == 'oauth':
        # OAuth authentication - requires token
        token = os.getenv('SNOWFLAKE_TOKEN')
        if not token:
            raise ValueError("SNOWFLAKE_TOKEN environment variable is required for OAuth auth")
        connection_params['token'] = token
    else:
        # Password authentication
        password = os.getenv('SNOWFLAKE_PASSWORD')
        if not password:
            raise ValueError("SNOWFLAKE_PASSWORD environment variable is required for password auth")
        connection_params['password'] = password
    
    fetcher = SnowflakePermissionsFetcher(connection_params)
    
    try:
        fetcher.connect()
        permissions_data = fetcher.fetch_all_permissions()
        
        # Save to JSON file
        output_file = 'permissions_data.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(permissions_data, f, indent=2, default=str)
        
        print(f"Permissions data saved to {output_file}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        fetcher.disconnect()

if __name__ == "__main__":
    main()