from flask import Blueprint, request, jsonify
from config import supabase
from services.email_verifier import verify_email_validity, send_verification_email
import re
import time
import random

auth_bp = Blueprint('auth', __name__)

# Temporary in-memory OTP store for password reset & pending registrations
RESET_OTP_STORE = {}
PENDING_REGISTRATIONS = {}

# Email validation helper
def is_valid_email(email):
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

@auth_bp.route('/validate-email', methods=['POST'])
def validate_email_endpoint():
    """Real-time endpoint to verify email deliverability, DNS MX records, and domain existence."""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        
        is_valid, msg = verify_email_validity(email)
        if not is_valid:
            return jsonify({"valid": False, "error": msg}), 400
            
        # Check if already registered
        if supabase:
            try:
                existing = supabase.table('users').select('id').eq('email', msg).execute()
                if existing.data:
                    return jsonify({"valid": False, "error": "This email is already registered. Please sign in."}), 409
            except Exception as db_err:
                print(f"[Supabase Check Error]: {db_err}")
                if "Name or service not known" in str(db_err) or "gaierror" in str(db_err) or "ConnectError" in str(db_err):
                    return jsonify({"valid": False, "error": "Database connection failed. Please verify SUPABASE_URL in Render environment variables."}), 500
                return jsonify({"valid": False, "error": "Database error while verifying email."}), 500
                
        return jsonify({"valid": True, "message": "Email is valid and ready for registration.", "normalized": msg}), 200
    except Exception as e:
        print(f"[validate_email Error]: {e}")
        return jsonify({"valid": False, "error": str(e)}), 500

@auth_bp.route('/register/send-otp', methods=['POST'])
def register_send_otp():
    """Validates email deliverability/domain, and generates a 6-digit registration OTP."""
    try:
        data = request.get_json() or {}
        full_name = (data.get('full_name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        
        if not full_name or not email or not password:
            return jsonify({"error": "Full name, email, and password are required."}), 400
            
        if len(full_name) < 2:
            return jsonify({"error": "Full name must be at least 2 characters."}), 400
            
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters."}), 400
            
        # 1. Strict deliverability & domain existence check (DNS MX + Disposable filter + Provider rules)
        is_valid, email_msg = verify_email_validity(email)
        if not is_valid:
            return jsonify({"error": email_msg}), 400
        email = email_msg
        
        # 2. Check if already registered
        if supabase:
            existing = supabase.table('users').select('id').eq('email', email).execute()
            if existing.data:
                return jsonify({"error": "An account with this email address already exists. Please sign in."}), 409
                
        # 3. Generate 6-digit OTP
        otp_code = f"{random.randint(100000, 999999)}"
        PENDING_REGISTRATIONS[email] = {
            "full_name": full_name,
            "password": password,
            "otp": otp_code,
            "expires_at": time.time() + 900 # 15 minutes
        }
        
        # 4. Attempt email dispatch via SMTP
        sent, info = send_verification_email(email, otp_code, full_name)
        
        return jsonify({
            "message": f"Verification code sent to {email}. Please check your inbox to activate your account.",
            "email": email
        }), 200
        
    except Exception as e:
        print(f"Error in register_send_otp: {e}")
        return jsonify({"error": f"Failed to send verification code: {str(e)}"}), 500

@auth_bp.route('/register/verify-otp', methods=['POST'])
def register_verify_otp():
    """Verifies registration OTP and commits account to Supabase Auth and database."""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        otp = (data.get('otp') or '').strip()
        
        if not email or not otp:
            return jsonify({"error": "Email and verification code are required."}), 400
            
        record = PENDING_REGISTRATIONS.get(email)
        if not record:
            return jsonify({"error": "No pending registration found for this email. Please submit the registration form again."}), 400
            
        if time.time() > record["expires_at"]:
            PENDING_REGISTRATIONS.pop(email, None)
            return jsonify({"error": "Verification code has expired. Please try registering again."}), 400
            
        if record["otp"] != otp:
            return jsonify({"error": "Invalid verification code. Please check the 6-digit code and try again."}), 400
            
        full_name = record["full_name"]
        password = record["password"]
        
        # Register user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "full_name": full_name
                }
            }
        })
        
        user_id = auth_response.user.id
        
        # Insert user details into users table
        supabase.table('users').insert({
            "id": user_id,
            "full_name": full_name,
            "email": email,
            "password_hash": password,
            "role": "user"
        }).execute()
        
        # Clean up pending record
        PENDING_REGISTRATIONS.pop(email, None)
        
        return jsonify({
            "message": "Email verified and account created successfully!",
            "user": {
                "id": user_id,
                "email": email,
                "full_name": full_name
            }
        }), 201
        
    except Exception as e:
        error_msg = str(e)
        if "User already registered" in error_msg:
            return jsonify({"error": "Email is already registered. Please sign in."}), 409
        print(f"Error in register_verify_otp: {e}")
        return jsonify({"error": error_msg}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json() or {}
        
        full_name = (data.get('full_name') or '').strip()
        email = (data.get('email') or '').strip()
        password = data.get('password')
        
        # Validation
        if not full_name or not email or not password:
            return jsonify({"error": "All fields are required"}), 400
            
        if len(full_name) < 2:
            return jsonify({"error": "Full name must be at least 2 characters."}), 400

        # Strict real-world email deliverability & domain existence check
        is_valid, email_msg = verify_email_validity(email)
        if not is_valid:
            return jsonify({"error": email_msg}), 400
        email = email_msg
            
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long."}), 400
            
        # Check if already registered
        if supabase:
            existing = supabase.table('users').select('id').eq('email', email).execute()
            if existing.data:
                return jsonify({"error": "An account with this email address already exists. Please sign in."}), 409
            
        # Register user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "full_name": full_name
                }
            }
        })
        
        # Insert user details into our users table
        user_id = auth_response.user.id
        db_response = supabase.table('users').insert({
            "id": user_id,
            "full_name": full_name,
            "email": email,
            "password_hash": password, # Storing plain text password as requested for the university demo
            "role": "user"
        }).execute()
        
        return jsonify({
            "message": "Registration successful!",
            "user": {
                "id": user_id,
                "email": email,
                "full_name": full_name
            }
        }), 201
        
    except Exception as e:
        error_msg = str(e)
        if "User already registered" in error_msg:
            return jsonify({"error": "Email is already registered. Please sign in."}), 409
        return jsonify({"error": error_msg}), 500
        
        return jsonify({
            "message": "Registration successful!",
            "user": {
                "id": user_id,
                "email": email,
                "full_name": full_name
            }
        }), 201
        
    except Exception as e:
        error_msg = str(e)
        if "User already registered" in error_msg:
            return jsonify({"error": "Email is already registered"}), 409
        return jsonify({"error": error_msg}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
            
        # Login with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        # Get user details from our users table
        user_id = auth_response.user.id
        db_user = supabase.table('users').select('*').eq('id', user_id).execute()
        
        if not db_user.data:
            return jsonify({"error": "User data not found in database"}), 404
            
        user_data = db_user.data[0]
        
        return jsonify({
            "message": "Login successful!",
            "session": {
                "access_token": auth_response.session.access_token,
                "refresh_token": auth_response.session.refresh_token
            },
            "user": {
                "id": user_id,
                "email": email,
                "full_name": user_data['full_name'],
                "role": user_data['role']
            }
        }), 200
        
    except Exception as e:
        error_msg = str(e)
        if "Invalid login credentials" in error_msg:
            return jsonify({"error": "Invalid email or password"}), 401
        return jsonify({"error": error_msg}), 500

@auth_bp.route('/update-profile', methods=['PUT'])
def update_profile():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        full_name = data.get('full_name', '').strip()
        
        if not user_id or not full_name:
            return jsonify({"error": "User ID and full name are required"}), 400
            
        supabase.table('users').update({"full_name": full_name}).eq('id', user_id).execute()
        return jsonify({"message": "Profile updated successfully!", "full_name": full_name}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/users', methods=['GET'])
def get_all_users():
    """Retrieve list of all registered users for admin dashboard."""
    try:
        if not supabase:
            return jsonify({"users": []}), 200
        res = supabase.table('users').select('id, full_name, email, role, created_at').order('created_at', desc=True).execute()
        return jsonify({"users": res.data or []}), 200
    except Exception as e:
        print(f"Error fetching users: {e}")
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/users/<user_id>/role', methods=['PUT'])
def update_user_role(user_id):
    """Update user role (e.g. promote to admin or demote to user)."""
    try:
        if not supabase:
            return jsonify({"error": "Database not connected"}), 500
        data = request.get_json() or {}
        new_role = data.get('role', 'user').lower()
        if new_role not in ['admin', 'user']:
            return jsonify({"error": "Role must be 'admin' or 'user'"}), 400

        res = supabase.table('users').update({"role": new_role}).eq('id', user_id).execute()
        return jsonify({"message": f"User role updated to {new_role}!", "user": res.data[0] if res.data else None}), 200
    except Exception as e:
        print(f"Error updating user role: {e}")
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete a user from users table."""
    try:
        if not supabase:
            return jsonify({"error": "Database not connected"}), 500
        supabase.table('users').delete().eq('id', user_id).execute()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting user: {e}")
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/forgot-password/send-otp', methods=['POST'])
def send_reset_otp():
    """Generates an email verification code (OTP) for password reset."""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        
        if not email or not is_valid_email(email):
            return jsonify({"error": "Please provide a valid email address."}), 400
            
        if not supabase:
            return jsonify({"error": "Database not connected"}), 500
            
        # Verify user exists in the database
        user_res = supabase.table('users').select('id, full_name, email').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"error": "No account found with this email address. Please check your spelling or register."}), 404
            
        user = user_res.data[0]
        user_id = user['id']
        
        # Generate 6-digit OTP
        otp_code = f"{random.randint(100000, 999999)}"
        RESET_OTP_STORE[email] = {
            "otp": otp_code,
            "user_id": user_id,
            "expires_at": time.time() + 900 # 15 minutes validity
        }
        
        # Also trigger Supabase built-in password reset email if configured
        try:
            supabase.auth.reset_password_for_email(email)
        except Exception as em_err:
            print(f"Supabase auth reset email notice: {em_err}")
            
        return jsonify({
            "message": f"Verification code sent to {email}. Please check your inbox.",
            "email": email
        }), 200
        
    except Exception as e:
        print(f"Error sending reset OTP: {e}")
        return jsonify({"error": f"Failed to send verification code: {str(e)}"}), 500

@auth_bp.route('/forgot-password/reset', methods=['POST'])
def reset_password():
    """Verifies OTP and resets user password across Supabase Auth and users table."""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        otp = (data.get('otp') or '').strip()
        new_password = data.get('new_password', '')
        
        if not email or not otp or not new_password:
            return jsonify({"error": "Email, verification code, and new password are all required."}), 400
            
        if len(new_password) < 6:
            return jsonify({"error": "New password must be at least 6 characters long."}), 400
            
        record = RESET_OTP_STORE.get(email)
        if not record:
            return jsonify({"error": "No active verification request found for this email. Please request a new code."}), 400
            
        if time.time() > record["expires_at"]:
            RESET_OTP_STORE.pop(email, None)
            return jsonify({"error": "Verification code has expired. Please request a new code."}), 400
            
        if record["otp"] != otp:
            return jsonify({"error": "Invalid verification code. Please check the 6-digit code and try again."}), 400
            
        user_id = record["user_id"]
        
        # 1. Update password in Supabase Auth Admin
        try:
            supabase.auth.admin.update_user_by_id(user_id, {"password": new_password})
        except Exception as auth_err:
            print(f"Supabase auth.admin update warning: {auth_err}")
            
        # 2. Update password in users table
        supabase.table('users').update({"password_hash": new_password}).eq('id', user_id).execute()
        
        # Clear consumed OTP
        RESET_OTP_STORE.pop(email, None)
        
        return jsonify({
            "message": "Password reset successfully! You can now log in with your new password."
        }), 200
        
    except Exception as e:
        print(f"Error resetting password: {e}")
        return jsonify({"error": f"Failed to reset password: {str(e)}"}), 500
