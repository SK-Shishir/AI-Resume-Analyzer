import os
import re
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

