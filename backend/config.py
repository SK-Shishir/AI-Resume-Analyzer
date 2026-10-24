import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Look for .env in current directory or parent directory
env_path = os.path.join(os.path.dirname(__file__), '.env')
parent_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
elif os.path.exists(parent_env):
    load_dotenv(parent_env)
else:
    load_dotenv()

raw_url = os.environ.get("SUPABASE_URL", "").strip().strip('"').strip("'")
raw_key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip().strip('"').strip("'")

url: str = raw_url
key: str = raw_key

supabase: Client = None

if not url or "YOUR_SUPABASE" in url:
    print("[Config Warning] SUPABASE_URL is missing or using placeholder in environment variables!")
elif not key or "YOUR_SUPABASE" in key:
    print("[Config Warning] SUPABASE_SERVICE_KEY is missing or using placeholder in environment variables!")
else:
    try:
        supabase = create_client(url, key)
        print("Supabase Configured Successfully!")
    except Exception as e:
        print(f"Error configuring Supabase: {e}")
        supabase = None

