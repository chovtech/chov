from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import asyncpg
import io
import zipfile
import re
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.schemas.projects import ProjectCreate, ProjectResponse, ProjectUpdate
from app.routers.upload import delete_r2_image
from app.services.email_service import send_install_email
from pydantic import BaseModel, EmailStr
from app.services.project_service import (
    create_project, get_projects, get_project,
    update_project, delete_project
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse)
async def create(
    body: ProjectCreate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Get workspace for this user
    if body.workspace_id:
        workspace = await db.fetchrow(
            "SELECT id FROM workspaces WHERE id = $1 AND owner_id = $2",
            body.workspace_id, current_user['id']
        )
    else:
        workspace = await db.fetchrow(
            "SELECT id FROM workspaces WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1",
            current_user['id']
        )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    project = await create_project(
        db=db,
        workspace_id=str(workspace['id']),
        name=body.name,
        page_url=body.page_url,
        platform=body.platform
    )
    return project


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    workspace_id: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if workspace_id:
        workspace = await db.fetchrow(
            """SELECT id FROM workspaces w WHERE w.id = $1 AND (
                   w.owner_id = $2
                   OR EXISTS (
                       SELECT 1 FROM workspace_members wm
                       WHERE wm.workspace_id = w.id AND wm.user_id = $2 AND wm.status = 'active'
                   )
               )""",
            workspace_id, current_user['id']
        )
    else:
        workspace = await db.fetchrow(
            "SELECT id FROM workspaces WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1",
            current_user['id']
        )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    projects = await get_projects(db, str(workspace['id']))
    return projects


async def _get_accessible_project(db: asyncpg.Connection, project_id: str, user_id) -> dict | None:
    """Fetch a project the user can access — either as workspace owner or as a workspace member."""
    row = await db.fetchrow(
        """SELECT p.* FROM projects p
           JOIN workspaces w ON p.workspace_id = w.id
           WHERE p.id = $1 AND (
               w.owner_id = $2
               OR EXISTS (
                   SELECT 1 FROM workspace_members wm
                   WHERE wm.workspace_id = w.id AND wm.user_id = $2 AND wm.status = 'active'
               )
           )""",
        project_id, user_id
    )
    return dict(row) if row else None


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_one(
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    project = await _get_accessible_project(db, project_id, current_user['id'])
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update(
    project_id: str,
    body: ProjectUpdate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    existing = await _get_accessible_project(db, project_id, current_user['id'])
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    if body.thumbnail_url and existing['thumbnail_url']:
        delete_r2_image(existing['thumbnail_url'])

    project = await update_project(
        db, project_id, str(existing['workspace_id']),
        name=body.name,
        status=body.status,
        script_verified=body.script_verified,
        page_url=body.page_url,
        thumbnail_url=body.thumbnail_url,
        platform=body.platform
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}")
async def delete(
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    existing = await _get_accessible_project(db, project_id, current_user['id'])
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    deleted = await delete_project(db, project_id, str(existing['workspace_id']))
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}


@router.get("/{project_id}/wordpress-plugin")
async def download_wordpress_plugin(
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    project = await _get_accessible_project(db, project_id, current_user['id'])
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get workspace brand name for white-labelling
    workspace = await db.fetchrow(
        "SELECT white_label_brand_name FROM workspaces WHERE id = $1",
        project['workspace_id']
    )
    brand_name = (workspace and workspace['white_label_brand_name']) or 'PagePersona'
    plugin_slug = re.sub(r'[^a-z0-9]+', '-', brand_name.lower()).strip('-')
    script_id = project['script_id']
    page_url = project['page_url']

    php = f"""<?php
/**
 * Plugin Name: {brand_name}
 * Plugin URI: https://usepagepersona.com
 * Description: Personalise your WordPress pages with {brand_name}. Map each page URL to its Script ID in Settings.
 * Version: 1.0.0
 * Author: {brand_name}
 */

if (!defined('ABSPATH')) exit;

define('PP_OPTION_KEY', '{plugin_slug}_mappings');

// ── Admin Menu ──────────────────────────────────────────────────────────────
add_action('admin_menu', function () {{
    add_options_page(
        '{brand_name} Settings',
        '{brand_name}',
        'manage_options',
        '{plugin_slug}',
        'pp_settings_page'
    );
}});

// ── Save Settings ────────────────────────────────────────────────────────────
add_action('admin_post_pp_save_settings', function () {{
    if (!current_user_can('manage_options')) wp_die('Unauthorized');
    check_admin_referer('pp_save_settings');
    $urls    = isset($_POST['pp_url'])    ? (array) $_POST['pp_url']    : [];
    $scripts = isset($_POST['pp_script']) ? (array) $_POST['pp_script'] : [];
    $mappings = [];
    foreach ($urls as $i => $url) {{
        $url    = esc_url_raw(trim($url));
        $script = sanitize_text_field(trim($scripts[$i] ?? ''));
        if ($url && $script) {{
            $mappings[] = ['url' => $url, 'script' => $script];
        }}
    }}
    update_option(PP_OPTION_KEY, $mappings);
    wp_redirect(admin_url('options-general.php?page={plugin_slug}&saved=1'));
    exit;
}});

// ── Settings Page ─────────────────────────────────────────────────────────────
function pp_settings_page() {{
    $mappings = get_option(PP_OPTION_KEY, [
        ['url' => '{page_url}', 'script' => '{script_id}']
    ]);
    $saved = isset($_GET['saved']) && $_GET['saved'] === '1';
    ?>
    <div class="wrap">
        <h1>{brand_name} — Page Script Mappings</h1>
        <p>Map each page URL to its Script ID. The personalisation script will only load on the matching page.</p>
        <?php if ($saved): ?>
            <div class="notice notice-success is-dismissible"><p>Settings saved.</p></div>
        <?php endif; ?>
        <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
            <?php wp_nonce_field('pp_save_settings'); ?>
            <input type="hidden" name="action" value="pp_save_settings" />
            <table class="widefat fixed" id="pp-table" style="margin-top:16px;">
                <thead>
                    <tr>
                        <th style="width:55%">Page URL</th>
                        <th style="width:35%">Script ID</th>
                        <th style="width:10%"></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($mappings as $m): ?>
                    <tr class="pp-row">
                        <td><input type="url" name="pp_url[]" value="<?php echo esc_attr($m['url']); ?>" placeholder="https://yoursite.com/page" style="width:100%" /></td>
                        <td><input type="text" name="pp_script[]" value="<?php echo esc_attr($m['script']); ?>" placeholder="PP-XXXXXX" style="width:100%" /></td>
                        <td><button type="button" class="button pp-remove">Remove</button></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <p>
                <button type="button" class="button" id="pp-add-row">+ Add Page</button>
                <input type="submit" class="button button-primary" value="Save Settings" style="margin-left:8px;" />
            </p>
        </form>
    </div>
    <script>
    document.getElementById('pp-add-row').addEventListener('click', function () {{
        var tbody = document.querySelector('#pp-table tbody');
        var row = document.createElement('tr');
        row.className = 'pp-row';
        row.innerHTML = '<td><input type="url" name="pp_url[]" placeholder="https://yoursite.com/page" style="width:100%"/></td>'
            + '<td><input type="text" name="pp_script[]" placeholder="PP-XXXXXX" style="width:100%"/></td>'
            + '<td><button type="button" class="button pp-remove">Remove</button></td>';
        tbody.appendChild(row);
    }});
    document.addEventListener('click', function (e) {{
        if (e.target && e.target.classList.contains('pp-remove')) {{
            if (document.querySelectorAll('.pp-row').length > 1)
                e.target.closest('tr').remove();
        }}
    }});
    </script>
    <?php
}}

// ── Inject Script on Frontend ────────────────────────────────────────────────
add_action('wp_head', function () {{
    $mappings = get_option(PP_OPTION_KEY, []);
    if (empty($mappings)) return;
    $current_path = untrailingslashit(strtok($_SERVER['REQUEST_URI'], '?'));
    $current_url  = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
                    . '://' . $_SERVER['HTTP_HOST'] . $current_path;
    foreach ($mappings as $m) {{
        $registered = untrailingslashit(rtrim($m['url'], '/'));
        if ($registered === $current_url || untrailingslashit(rtrim($m['url'], '/')) === $current_url) {{
            $id = esc_attr($m['script']);
            echo "\\n<script async src=\\"https://cdn.usepagepersona.com/pp.js?id={{$id}}\\"></script>\\n";
            break;
        }}
    }}
}});
"""

    # Build ZIP in memory
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f'{plugin_slug}/{plugin_slug}.php', php)
    buf.seek(0)

    filename = f'{plugin_slug}-plugin.zip'
    return StreamingResponse(
        buf,
        media_type='application/zip',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )


class SendInstallEmailRequest(BaseModel):
    developer_email: EmailStr

@router.post("/{project_id}/send-install-email")
async def send_install_email_endpoint(
    project_id: str,
    body: SendInstallEmailRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    project = await _get_accessible_project(db, project_id, current_user['id'])
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    script_tag = f'<script async src="https://cdn.usepagepersona.com/pp.js?id={project["script_id"]}"></script>'
    lang = current_user.get('language', 'en')
    sent = send_install_email(body.developer_email, script_tag, project['name'], lang)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send email")
    return {"message": "Installation email sent"}
