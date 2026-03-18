import boto3
from botocore.exceptions import ClientError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_ses_client():
    return boto3.client(
        "ses",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )

def send_email(to_email: str, subject: str, html_body: str, text_body: str = ""):
    client = get_ses_client()
    sender = f"{settings.SES_SENDER_NAME} <{settings.SES_SENDER_EMAIL}>"
    try:
        response = client.send_email(
            Source=sender,
            Destination={"ToAddresses": [to_email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                    "Text": {"Data": text_body or subject, "Charset": "UTF-8"},
                },
            },
        )
        logger.info(f"Email sent to {to_email} — MessageId: {response['MessageId']}")
        return True
    except ClientError as e:
        logger.error(f"SES error sending to {to_email}: {e.response['Error']['Message']}")
        return False

def send_welcome_email(to_email: str, name: str):
    subject = f"Welcome to PagePersona, {name.split()[0]}!"
    html_body = f"""
    <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1A56DB">Welcome to PagePersona 👋</h2>
      <p>Hi {name.split()[0]},</p>
      <p>Your account is ready. Start personalising your sales pages and converting more visitors today.</p>
      <a href="{settings.FRONTEND_URL}/dashboard"
         style="display:inline-block;padding:12px 24px;background:#1A56DB;color:#fff;
                border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        Go to Dashboard →
      </a>
      <p style="color:#64748b;font-size:14px">If you have any questions, reply to this email — we read every one.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:12px">PagePersona · usepagepersona.com</p>
    </body></html>
    """
    return send_email(to_email, subject, html_body)

def send_password_reset_email(to_email: str, name: str, reset_token: str):
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    subject = "Reset your PagePersona password"
    html_body = f"""
    <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1A56DB">Reset your password</h2>
      <p>Hi {name.split()[0]},</p>
      <p>We received a request to reset your password. Click the button below to set a new one.</p>
      <a href="{reset_url}"
         style="display:inline-block;padding:12px 24px;background:#1A56DB;color:#fff;
                border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        Reset Password →
      </a>
      <p style="color:#64748b;font-size:14px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:12px">PagePersona · usepagepersona.com</p>
    </body></html>
    """
    return send_email(to_email, subject, html_body)

def send_jvzoo_welcome_email(to_email: str, name: str, magic_link: str):
    subject = "Your PagePersona account is ready!"
    html_body = f"""
    <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1A56DB">You're in! 🎉</h2>
      <p>Hi {name.split()[0]},</p>
      <p>Thank you for purchasing PagePersona. Your account has been created and is ready to use.</p>
      <p>Click below to log in instantly — no password needed:</p>
      <a href="{magic_link}"
         style="display:inline-block;padding:12px 24px;background:#1A56DB;color:#fff;
                border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        Access My Account →
      </a>
      <p style="color:#64748b;font-size:14px">This link expires in 24 hours.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:12px">PagePersona · usepagepersona.com</p>
    </body></html>
    """
    return send_email(to_email, subject, html_body)
