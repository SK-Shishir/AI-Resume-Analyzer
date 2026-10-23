import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY") # We use service key in backend for admin rights

try:
    supabase: Client = create_client(url, key)
    print("Supabase Configured Successfully!")
except Exception as e:
    print(f"Error configuring Supabase: {e}")
    supabase = None
