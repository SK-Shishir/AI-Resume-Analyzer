import os
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email_validator import validate_email, EmailNotValidError
from dotenv import load_dotenv

# Load environment variables
backend_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(backend_env):
    load_dotenv(backend_env)
else:
    load_dotenv()

DISPOSABLE_DOMAINS = {
    'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'sharklasers.com', 'yopmail.com', 'trashmail.com', 'throwawaymail.com',
    'getairmail.com', 'dispostable.com', 'fakemailgenerator.com', 'maildrop.cc',
    'temp-mail.org', '10minutemail.net', 'crazymailing.com', 'mytemp.email',
    'burnermail.io', 'inboxkitten.com', 'nada.ltd', 'mohmal.com', 'generator.email',
    'zillamail.com', 'trashmail.net', 'disposablemail.com'
}

def verify_email_validity(email: str):
    """
    Validates email format, domain existence via real DNS MX records,
    blocks disposable temporary email domains, and enforces provider rules (e.g. Gmail).
    Returns (is_valid: bool, error_message_or_normalized: str)
    """
    if not email or not isinstance(email, str):
        return False, "Email address is required."
        
    email = email.strip().lower()
    
    # 1. DNS MX and deliverability check using email-validator & dnspython
    try:
        valid_info = validate_email(email, check_deliverability=True)
        normalized = valid_info.normalized
    except EmailNotValidError as e:
        err_msg = str(e)
        if "does not exist" in err_msg or "cannot be resolved" in err_msg:
            return False, "This email domain does not exist or has no active mail server."
        if "deliver" in err_msg.lower() or "mx" in err_msg.lower():
            return False, "This email domain cannot receive incoming emails."
        return False, err_msg
        
    parts = normalized.split('@')
    user_part, domain_part = parts[0], parts[1]
    
    # 2. Block disposable/temporary mailboxes
    if domain_part in DISPOSABLE_DOMAINS:
        return False, f"Temporary and disposable emails (@{domain_part}) are not allowed. Please use your real email."

    # 3. Block placeholder/fake usernames
    FAKE_USERNAMES = {
        'test', 'testing', 'admin', 'administrator', 'user', 'fake', 'fakeuser',
        'asdf', 'asdfgh', 'asdfghjk', 'qwerty', '123456', '12345678', 'demo', 'example'
    }
    cleaned_user = user_part.replace('.', '')
    if cleaned_user in FAKE_USERNAMES:
        return False, f"'{email}' appears to be a placeholder or fake email. Please use your real personal email."
        
    # 4. Gmail-specific validity rules
    if domain_part == 'gmail.com':
        if len(user_part) < 6:
            return False, "Gmail username must be at least 6 characters long."
        if len(user_part) > 30:
            return False, "Gmail username cannot exceed 30 characters."
        if not re.match(r'^[a-z0-9]+(\.[a-z0-9]+)*$', user_part):
            return False, "Invalid Gmail address format (cannot have consecutive or trailing dots)."
            
    # 5. Yahoo & Outlook specific sanity checks
    if domain_part in ('yahoo.com', 'outlook.com', 'hotmail.com'):
        if len(user_part) < 3:
            return False, f"Username for @{domain_part} is too short."
            
    return True, normalized

def send_verification_email(to_email: str, otp_code: str, user_name: str = "User"):
    """
    Attempts to send email via SMTP if configured in .env.
    Returns (success: bool, info_message: str)
    """
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_pass or smtp_user.startswith("YOUR_"):
        # SMTP not configured - log for demo/local environment
        print(f"[DEMO EMAIL] Verification OTP for {to_email}: {otp_code}")
        return False, "SMTP credentials not configured in backend/.env"
        
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your Verification Code: {otp_code} — Career Intelligence"
        msg["From"] = f"Career Intelligence <{smtp_user}>"
        msg["To"] = to_email
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #7C3AED; margin-top: 0;">Career Intelligence</h2>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Thank you for signing up. Please use the following 6-digit verification code to complete your registration:</p>
            <div style="background: #F3F4F6; padding: 16px; text-align: center; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1E293B; margin: 20px 0;">
                {otp_code}
            </div>
            <p style="color: #64748B; font-size: 13px;">This code will expire in 15 minutes. If you did not request this, please disregard this email.</p>
        </div>
        """
        msg.attach(MIMEText(html_content, "html"))
        
        with smtplib.SMTP(smtp_host, smtp_port, timeout=8) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, [to_email], msg.as_string())
            
        return True, "Email sent successfully"
    except Exception as e:
        print(f"Error sending SMTP email to {to_email}: {e}")
        return False, str(e)
