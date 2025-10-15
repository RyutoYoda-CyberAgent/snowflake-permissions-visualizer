#!/usr/bin/env python3
"""
Auto Refresh Service for Snowflake Permissions
Monitors changes and automatically updates the permissions data
"""

import time
import json
import hashlib
import os
import logging
from datetime import datetime
from threading import Thread
from fetch_permissions import SnowflakePermissionsFetcher

class PermissionsMonitor:
    def __init__(self, connection_params, check_interval=300):  # Default: 5 minutes
        self.connection_params = connection_params
        self.check_interval = check_interval
        self.last_hash = None
        self.running = False
        self.fetcher = None
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('permissions_monitor.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def get_data_hash(self, data):
        """Generate hash of permissions data for change detection"""
        # Convert data to string and create hash
        data_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(data_str.encode()).hexdigest()
    
    def fetch_and_compare(self):
        """Fetch current permissions and compare with previous state"""
        try:
            if not self.fetcher:
                self.fetcher = SnowflakePermissionsFetcher(self.connection_params)
                self.fetcher.connect()
            
            self.logger.info("Fetching current permissions data...")
            current_data = self.fetcher.fetch_all_permissions()
            current_hash = self.get_data_hash(current_data)
            
            if self.last_hash is None:
                # First run - save initial state
                self.last_hash = current_hash
                self.save_permissions_data(current_data)
                self.logger.info("Initial permissions data saved")
                return False
            
            if current_hash != self.last_hash:
                # Changes detected
                self.logger.info("Permissions changes detected! Updating data...")
                self.save_permissions_data(current_data)
                self.last_hash = current_hash
                
                # Log the changes
                self.log_changes(current_data)
                return True
            else:
                self.logger.info("No changes detected")
                return False
                
        except Exception as e:
            self.logger.error(f"Error during permissions check: {e}")
            return False
    
    def save_permissions_data(self, data):
        """Save permissions data to JSON file"""
        try:
            # Save current data
            with open('permissions_data.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
            
            # Also save a timestamped backup
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f'permissions_backup_{timestamp}.json'
            with open(backup_filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
            
            self.logger.info(f"Permissions data saved to permissions_data.json and {backup_filename}")
            
        except Exception as e:
            self.logger.error(f"Error saving permissions data: {e}")
    
    def log_changes(self, current_data):
        """Log details about what changed"""
        changes_log = {
            "timestamp": datetime.now().isoformat(),
            "changes_detected": True,
            "summary": {
                "total_roles": len(current_data.get("roles", [])),
                "total_users": len(current_data.get("users", [])),
                "total_databases": len(current_data.get("databases", [])),
                "total_role_grants": sum(len(grants) for grants in current_data.get("role_grants", {}).values()),
                "total_user_grants": sum(len(grants) for grants in current_data.get("user_grants", {}).values())
            }
        }
        
        # Save changes log
        with open('changes_log.json', 'a', encoding='utf-8') as f:
            f.write(json.dumps(changes_log, default=str) + '\n')
        
        self.logger.info(f"Changes logged: {changes_log['summary']}")
    
    def start_monitoring(self):
        """Start the monitoring service"""
        self.running = True
        self.logger.info(f"Starting permissions monitoring (check interval: {self.check_interval} seconds)")
        
        while self.running:
            try:
                changes_detected = self.fetch_and_compare()
                if changes_detected:
                    self.notify_web_clients()
                
                # Wait for next check
                for _ in range(self.check_interval):
                    if not self.running:
                        break
                    time.sleep(1)
                    
            except KeyboardInterrupt:
                self.logger.info("Monitoring stopped by user")
                break
            except Exception as e:
                self.logger.error(f"Unexpected error in monitoring loop: {e}")
                time.sleep(60)  # Wait 1 minute before retrying
    
    def stop_monitoring(self):
        """Stop the monitoring service"""
        self.running = False
        if self.fetcher:
            self.fetcher.disconnect()
        self.logger.info("Monitoring service stopped")
    
    def notify_web_clients(self):
        """Create a notification file for web clients to detect changes"""
        notification = {
            "timestamp": datetime.now().isoformat(),
            "message": "Permissions data has been updated"
        }
        
        with open('update_notification.json', 'w', encoding='utf-8') as f:
            json.dump(notification, f, default=str)
        
        self.logger.info("Web client notification created")

class WebServerIntegration:
    """Simple HTTP server integration for real-time updates"""
    
    @staticmethod
    def create_status_endpoint():
        """Create a simple status endpoint that web clients can poll"""
        from http.server import HTTPServer, BaseHTTPRequestHandler
        import json
        
        class StatusHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path == '/status':
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    status = {
                        "timestamp": datetime.now().isoformat(),
                        "status": "running",
                        "last_update": self.get_last_update_time()
                    }
                    
                    self.wfile.write(json.dumps(status).encode())
                
                elif self.path == '/update-notification':
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    try:
                        with open('update_notification.json', 'r') as f:
                            notification = f.read()
                        self.wfile.write(notification.encode())
                        # Remove the notification file after reading
                        os.remove('update_notification.json')
                    except FileNotFoundError:
                        self.wfile.write(json.dumps({"message": "No updates"}).encode())
                
                else:
                    self.send_response(404)
                    self.end_headers()
            
            def get_last_update_time(self):
                try:
                    stat = os.stat('permissions_data.json')
                    return datetime.fromtimestamp(stat.st_mtime).isoformat()
                except:
                    return None
            
            def log_message(self, format, *args):
                # Suppress default logging
                pass
        
        return HTTPServer(('localhost', 8081), StatusHandler)

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
    
    # Get check interval from environment variable (default: 5 minutes)
    check_interval = int(os.getenv('CHECK_INTERVAL', '300'))
    
    monitor = PermissionsMonitor(connection_params, check_interval)
    
    # Start web server in a separate thread
    server = WebServerIntegration.create_status_endpoint()
    server_thread = Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print("Status server started on http://localhost:8081")
    
    try:
        # Start monitoring
        monitor.start_monitoring()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        monitor.stop_monitoring()
        server.shutdown()

if __name__ == "__main__":
    main()