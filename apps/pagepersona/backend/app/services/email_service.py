import boto3
from botocore.exceptions import ClientError
from app.core.config import settings
from app.templates.emails.emails import (
    render_verification, render_welcome,
    render_password_reset, render_jvzoo_welcome
)
import logging

logger = logging.getLogger(__name__)

def get_ses_client():
    return boto3.client(
        "ses",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )

def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
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

def _get_firstname(name: str, email: str) -> str:
    parts = (name or "").split()
    return parts[0] if parts else email.split('@')[0]

def send_verification_email(to_email: str, name: str, verify_token: str, lang: str = "en") -> bool:
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={verify_token}"
    firstname = _get_firstname(name, to_email)
    subject, html = render_verification(firstname, verify_url, lang)
    return send_email(to_email, subject, html)

def send_welcome_email(to_email: str, name: str, lang: str = "en") -> bool:
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    firstname = _get_firstname(name, to_email)
    subject, html = render_welcome(firstname, dashboard_url, lang)
    return send_email(to_email, subject, html)

def send_password_reset_email(to_email: str, name: str, reset_token: str, lang: str = "en") -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    firstname = _get_firstname(name, to_email)
    subject, html = render_password_reset(firstname, reset_url, lang)
    return send_email(to_email, subject, html)

def send_jvzoo_welcome_email(to_email: str, name: str, magic_link: str, lang: str = "en") -> bool:
    firstname = _get_firstname(name, to_email)
    subject, html = render_jvzoo_welcome(firstname, magic_link, lang)
    return send_email(to_email, subject, html)

def send_magic_link_email(to_email: str, name: str, magic_token: str, lang: str = "en") -> bool:
    magic_url = f"{settings.FRONTEND_URL}/auth/magic?token={magic_token}"
    firstname = _get_firstname(name, to_email)
    subjects = {"en": "Your PagePersona magic link", "fr": "Votre lien magique PagePersona"}
    bodies = {
        "en": f"Hi {firstname}, click below to log in instantly — no password needed.",
        "fr": f"Bonjour {firstname}, cliquez ci-dessous pour vous connecter instantanément — aucun mot de passe nécessaire.",
    }
    ctas = {"en": "Log In to PagePersona →", "fr": "Se connecter à PagePersona →"}
    footers = {
        "en": "This link works once and expires in 24 hours.",
        "fr": "Ce lien fonctionne une seule fois et expire dans 24 heures.",
    }
    subject = subjects.get(lang, subjects["en"])
    html = f"""
    <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1A56DB">{'Your magic link 🪄' if lang != 'fr' else 'Votre lien magique 🪄'}</h2>
      <p>{bodies.get(lang, bodies['en'])}</p>
      <a href="{magic_url}" style="display:inline-block;padding:12px 24px;background:#1A56DB;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        {ctas.get(lang, ctas['en'])}
      </a>
      <p style="color:#64748b;font-size:14px">{footers.get(lang, footers['en'])}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:12px">PagePersona · usepagepersona.com</p>
    </body></html>
    """
    return send_email(to_email, subject, html)

def send_install_email(to_email: str, script_tag: str, project_name: str, lang: str = "en") -> bool:
    subjects = {
        "en": f"PagePersona installation instructions for {project_name}",
        "fr": f"Instructions d'installation PagePersona pour {project_name}",
    }
    headings = {
        "en": "Install PagePersona on your page",
        "fr": "Installer PagePersona sur votre page",
    }
    intros = {
        "en": f"You've been asked to install the PagePersona script on <strong>{project_name}</strong>. Paste the tag below before the <code>&lt;/body&gt;</code> tag on your page:",
        "fr": f"Vous avez été invité à installer le script PagePersona sur <strong>{project_name}</strong>. Collez la balise ci-dessous avant la balise <code>&lt;/body&gt;</code> de votre page :",
    }
    footers = {
        "en": "The script loads asynchronously and won't slow down your page. Once installed, reply to whoever sent this email to let them know.",
        "fr": "Le script se charge de manière asynchrone et ne ralentira pas votre page. Une fois installé, répondez à la personne qui vous a envoyé cet e-mail pour la prévenir.",
    }
    subject = subjects.get(lang, subjects["en"])
    html = f"""
    <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1A56DB">{headings.get(lang, headings['en'])}</h2>
      <p style="color:#334155">{intros.get(lang, intros['en'])}</p>
      <div style="background:#0F172A;border-radius:10px;padding:20px;margin:20px 0">
        <code style="color:#93c5fd;font-size:13px;word-break:break-all">{script_tag}</code>
      </div>
      <p style="color:#64748b;font-size:14px">{footers.get(lang, footers['en'])}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:12px">PagePersona · usepagepersona.com</p>
    </body></html>
    """
    return send_email(to_email, subject, html)
