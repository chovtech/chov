"""
Email template registry.
To add a new language: add a new key to each template dict.
Keys must match the language codes in /locales/languages.ts
"""

# ── BASE LAYOUT ────────────────────────────────────────
def base_layout(content: str, lang: str = "en", brand_name: str = "PagePersona", hide_powered_by: bool = False) -> str:
    if brand_name == "PagePersona":
        footer_text = "PagePersona · usepagepersona.com"
    elif hide_powered_by:
        footer_text = brand_name
    else:
        footer_text = f"{brand_name} · Powered by PagePersona"
    return f"""
    <html>
    <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b">
      {content}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0"/>
      <p style="color:#94a3b8;font-size:12px;text-align:center">
        {footer_text}
      </p>
    </body>
    </html>
    """

# ── VERIFICATION EMAIL ─────────────────────────────────
VERIFICATION = {
    "en": {
        "subject": "Verify your PagePersona email",
        "heading": "Verify your email",
        "body": "Thanks for signing up. Click below to verify your email address and activate your account.",
        "cta": "Verify Email →",
        "footer": "This link expires in 24 hours. If you didn't sign up, ignore this email.",
    },
    "fr": {
        "subject": "Vérifiez votre e-mail PagePersona",
        "heading": "Vérifiez votre e-mail",
        "body": "Merci de vous être inscrit. Cliquez ci-dessous pour vérifier votre adresse e-mail et activer votre compte.",
        "cta": "Vérifier l'e-mail →",
        "footer": "Ce lien expire dans 24 heures. Si vous ne vous êtes pas inscrit, ignorez cet e-mail.",
    },
}

# ── WELCOME EMAIL ──────────────────────────────────────
WELCOME = {
    "en": {
        "subject": "Welcome to PagePersona",
        "heading": "Welcome to PagePersona 👋",
        "body": "Your account is ready. Start personalising your sales pages and converting more visitors today.",
        "cta": "Go to Dashboard →",
        "footer": "If you have any questions, reply to this email — we read every one.",
    },
    "fr": {
        "subject": "Bienvenue sur PagePersona",
        "heading": "Bienvenue sur PagePersona 👋",
        "body": "Votre compte est prêt. Commencez à personnaliser vos pages de vente et convertissez plus de visiteurs dès aujourd'hui.",
        "cta": "Aller au tableau de bord →",
        "footer": "Si vous avez des questions, répondez à cet e-mail — nous lisons chaque message.",
    },
}

# ── PASSWORD RESET EMAIL ───────────────────────────────
PASSWORD_RESET = {
    "en": {
        "subject": "Reset your PagePersona password",
        "heading": "Reset your password",
        "body": "We received a request to reset your password. Click the button below to set a new one.",
        "cta": "Reset Password →",
        "footer": "This link expires in 1 hour. If you didn't request this, ignore this email.",
    },
    "fr": {
        "subject": "Réinitialisez votre mot de passe PagePersona",
        "heading": "Réinitialisez votre mot de passe",
        "body": "Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau.",
        "cta": "Réinitialiser le mot de passe →",
        "footer": "Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet e-mail.",
    },
}

# ── JVZOO WELCOME EMAIL ────────────────────────────────
JVZOO_WELCOME = {
    "en": {
        "subject": "Your PagePersona account is ready!",
        "heading": "You're in! 🎉",
        "body": "Thank you for purchasing PagePersona. Your account has been created and is ready to use.",
        "body2": "Click below to log in instantly — no password needed:",
        "cta": "Access My Account →",
        "footer": "This link expires in 24 hours.",
    },
    "fr": {
        "subject": "Votre compte PagePersona est prêt !",
        "heading": "Vous êtes inscrit ! 🎉",
        "body": "Merci d'avoir acheté PagePersona. Votre compte a été créé et est prêt à être utilisé.",
        "body2": "Cliquez ci-dessous pour vous connecter instantanément — aucun mot de passe nécessaire :",
        "cta": "Accéder à mon compte →",
        "footer": "Ce lien expire dans 24 heures.",
    },
}

def get_template(template: dict, lang: str) -> dict:
    """Get template for language, fall back to English."""
    return template.get(lang) or template["en"]

def render_verification(firstname: str, verify_url: str, lang: str = "en",
                        brand_name: str = "PagePersona", brand_color: str = "#1A56DB",
                        logo_url=None, hide_powered_by: bool = False) -> tuple[str, str]:
    t = get_template(VERIFICATION, lang)
    subject = t["subject"].replace("PagePersona", brand_name)
    logo = f'<img src="{logo_url}" alt="{brand_name}" style="max-height:48px;margin-bottom:16px;display:block"/>' if logo_url else ''
    footer_line = f'<p style="color:#94a3b8;font-size:12px;text-align:center">{"PagePersona · usepagepersona.com" if brand_name == "PagePersona" else (brand_name if hide_powered_by else brand_name + " · Powered by PagePersona")}</p>'
    html = f"""<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b">
      {logo}
      <h2 style="color:{brand_color}">{t['heading']}</h2>
      <p>Hi {firstname},</p>
      <p>{t['body']}</p>
      <a href="{verify_url}" style="display:inline-block;padding:12px 24px;background:{brand_color};color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">{t['cta']}</a>
      <p style="color:#64748b;font-size:14px">{t['footer']}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0"/>
      {footer_line}
    </body></html>"""
    return subject, html

def render_welcome(firstname: str, dashboard_url: str, lang: str = "en",
                   brand_name: str = "PagePersona", brand_color: str = "#1A56DB",
                   logo_url=None, hide_powered_by: bool = False) -> tuple[str, str]:
    t = get_template(WELCOME, lang)
    subject = t["subject"].replace("PagePersona", brand_name)
    heading = t["heading"].replace("PagePersona", brand_name)
    body = t["body"].replace("PagePersona", brand_name)
    logo = f'<img src="{logo_url}" alt="{brand_name}" style="max-height:48px;margin-bottom:16px;display:block"/>' if logo_url else ''
    footer_line = f'<p style="color:#94a3b8;font-size:12px;text-align:center">{"PagePersona · usepagepersona.com" if brand_name == "PagePersona" else (brand_name if hide_powered_by else brand_name + " · Powered by PagePersona")}</p>'
    html = f"""<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b">
      {logo}
      <h2 style="color:{brand_color}">{heading}</h2>
      <p>Hi {firstname},</p>
      <p>{body}</p>
      <a href="{dashboard_url}" style="display:inline-block;padding:12px 24px;background:{brand_color};color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">{t['cta']}</a>
      <p style="color:#64748b;font-size:14px">{t['footer']}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0"/>
      {footer_line}
    </body></html>"""
    return subject, html

def render_password_reset(firstname: str, reset_url: str, lang: str = "en",
                          brand_name: str = "PagePersona", brand_color: str = "#1A56DB",
                          logo_url=None, hide_powered_by: bool = False) -> tuple[str, str]:
    t = get_template(PASSWORD_RESET, lang)
    subject = t["subject"].replace("PagePersona", brand_name)
    logo = f'<img src="{logo_url}" alt="{brand_name}" style="max-height:48px;margin-bottom:16px;display:block"/>' if logo_url else ''
    footer_line = f'<p style="color:#94a3b8;font-size:12px;text-align:center">{"PagePersona · usepagepersona.com" if brand_name == "PagePersona" else (brand_name if hide_powered_by else brand_name + " · Powered by PagePersona")}</p>'
    html = f"""<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b">
      {logo}
      <h2 style="color:{brand_color}">{t['heading']}</h2>
      <p>Hi {firstname},</p>
      <p>{t['body']}</p>
      <a href="{reset_url}" style="display:inline-block;padding:12px 24px;background:{brand_color};color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">{t['cta']}</a>
      <p style="color:#64748b;font-size:14px">{t['footer']}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0"/>
      {footer_line}
    </body></html>"""
    return subject, html

def render_jvzoo_welcome(firstname: str, magic_link: str, lang: str = "en") -> tuple[str, str]:
    t = get_template(JVZOO_WELCOME, lang)
    html = base_layout(f"""
      <h2 style="color:#1A56DB">{t['heading']}</h2>
      <p>Hi {firstname},</p>
      <p>{t['body']}</p>
      <p>{t['body2']}</p>
      <a href="{magic_link}" style="display:inline-block;padding:12px 24px;background:#1A56DB;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        {t['cta']}
      </a>
      <p style="color:#64748b;font-size:14px">{t['footer']}</p>
    """, lang)
    return t["subject"], html


# ── PLAN EXPIRY WARNING EMAILS ────────────────────────────
EXPIRY_WARNING = {
    "en": {
        "subject_grace":  "Your {plan} plan has expired — {days} days to renew",
        "subject_final":  "Last day — your {plan} plan locks tomorrow",
        "heading":        "Your {plan} plan has expired",
        "body_grace":     "Your {plan} plan expired {days_ago} day{s} ago. You still have full access for {days_left} more day{s2} — after that your account will revert to the Core (free) plan.",
        "body_final":     "Your {plan} plan expired 7 days ago. Tomorrow your account will revert to the Core (free) plan and plan-exclusive features will be locked.",
        "cta":            "Renew Now →",
        "footer":         "Questions? Contact us at support@chovtech.com",
    },
}

def render_expiry_warning(
    firstname: str,
    plan_label: str,
    days_ago: int,
    days_left: int,
    upgrade_url: str,
    lang: str = "en",
) -> tuple[str, str]:
    t = get_template(EXPIRY_WARNING, lang)
    is_final = days_left <= 1
    subject = (t["subject_final"] if is_final else t["subject_grace"]).format(
        plan=plan_label, days=days_left
    )
    s  = "" if days_ago == 1 else "s"
    s2 = "" if days_left == 1 else "s"
    body = (t["body_final"] if is_final else t["body_grace"]).format(
        plan=plan_label, days_ago=days_ago, days_left=days_left, s=s, s2=s2
    )
    html = base_layout(f"""
      <h2 style="color:#f59e0b">⚠️ {t['heading'].format(plan=plan_label)}</h2>
      <p>Hi {firstname},</p>
      <p>{body}</p>
      <a href="{upgrade_url}" style="display:inline-block;padding:12px 24px;background:#1A56DB;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        {t['cta']}
      </a>
      <p style="color:#64748b;font-size:14px">{t['footer']}</p>
    """, lang)
    return subject, html


def render_project_report(
    sender_name: str,
    project_name: str,
    project_url: str,
    report_url: str,
    message: str,
    snapshot: dict,
    brand_name: str = "PagePersona",
    brand_color: str = "#1A56DB",
    hide_powered_by: bool = False,
) -> tuple[str, str]:
    """Email sent to report recipient — summary in body, link to full public report."""
    total_visits    = snapshot.get("total_visits", 0)
    rules_fired     = snapshot.get("rules_fired", 0)
    personalisation = snapshot.get("personalisation_rate", 0)
    period          = snapshot.get("period", 30)

    message_block = f'<p style="background:#f8fafc;border-left:4px solid {brand_color};padding:12px 16px;border-radius:0 8px 8px 0;font-size:14px;color:#334155;margin:16px 0">{message}</p>' if message else ""

    subject = f"{project_name} — Analytics Report"
    html = base_layout(f"""
      <h2 style="color:{brand_color}">{brand_name} Analytics Report</h2>
      <p><strong>{sender_name}</strong> has shared an analytics report for <strong>{project_name}</strong>.</p>
      {message_block}
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr>
          <td style="padding:14px;background:#f8fafc;border-radius:8px;text-align:center;width:33%">
            <div style="font-size:26px;font-weight:900;color:#1e293b">{total_visits}</div>
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px">Visits</div>
          </td>
          <td style="width:2%"></td>
          <td style="padding:14px;background:#f8fafc;border-radius:8px;text-align:center;width:33%">
            <div style="font-size:26px;font-weight:900;color:#1e293b">{rules_fired}</div>
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px">Rules Fired</div>
          </td>
          <td style="width:2%"></td>
          <td style="padding:14px;background:#f8fafc;border-radius:8px;text-align:center;width:33%">
            <div style="font-size:26px;font-weight:900;color:{brand_color}">{personalisation}%</div>
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px">Personalised</div>
          </td>
        </tr>
      </table>
      <p style="font-size:13px;color:#64748b">Data from the last <strong>{period} days</strong> for <a href="{project_url}" style="color:{brand_color}">{project_url}</a></p>
      <a href="{report_url}" style="display:inline-block;padding:12px 24px;background:{brand_color};color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0">
        View Full Report →
      </a>
      <p style="color:#94a3b8;font-size:12px">This report was sent to you by {sender_name} via {brand_name}. No account needed to view it.</p>
    """, brand_name=brand_name, hide_powered_by=hide_powered_by)
    return subject, html
