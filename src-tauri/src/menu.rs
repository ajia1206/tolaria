use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, MenuItemKind, Submenu, SubmenuBuilder},
    App, AppHandle, Emitter,
};

// Custom menu item IDs that emit events to the frontend.
const APP_SETTINGS: &str = "app-settings";
const APP_CHECK_FOR_UPDATES: &str = "app-check-for-updates";

const FILE_NEW_NOTE: &str = "file-new-note";
const FILE_NEW_TYPE: &str = "file-new-type";
const FILE_QUICK_OPEN: &str = "file-quick-open";
const FILE_QUICK_OPEN_ALIAS: &str = "file-quick-open-alias";
const FILE_SAVE: &str = "file-save";

const EDIT_FIND_IN_VAULT: &str = "edit-find-in-vault";
const EDIT_TOGGLE_NOTE_LIST_SEARCH: &str = "edit-toggle-note-list-search";
const EDIT_TOGGLE_RAW_EDITOR: &str = "edit-toggle-raw-editor";
const EDIT_TOGGLE_DIFF: &str = "edit-toggle-diff";

const VIEW_EDITOR_ONLY: &str = "view-editor-only";
const VIEW_EDITOR_LIST: &str = "view-editor-list";
const VIEW_ALL: &str = "view-all";
const VIEW_TOGGLE_PROPERTIES: &str = "view-toggle-properties";
const VIEW_TOGGLE_AI_CHAT: &str = "view-toggle-ai-chat";
const VIEW_TOGGLE_BACKLINKS: &str = "view-toggle-backlinks";
const VIEW_COMMAND_PALETTE: &str = "view-command-palette";
const VIEW_ZOOM_IN: &str = "view-zoom-in";
const VIEW_ZOOM_OUT: &str = "view-zoom-out";
const VIEW_ZOOM_RESET: &str = "view-zoom-reset";
const VIEW_GO_BACK: &str = "view-go-back";
const VIEW_GO_FORWARD: &str = "view-go-forward";

const GO_ALL_NOTES: &str = "go-all-notes";
const GO_ARCHIVED: &str = "go-archived";
const GO_CHANGES: &str = "go-changes";
const GO_INBOX: &str = "go-inbox";

const NOTE_TOGGLE_ORGANIZED: &str = "note-toggle-organized";
const NOTE_ARCHIVE: &str = "note-archive";
const NOTE_DELETE: &str = "note-delete";
const NOTE_OPEN_IN_NEW_WINDOW: &str = "note-open-in-new-window";
const NOTE_RESTORE_DELETED: &str = "note-restore-deleted";

const VAULT_OPEN: &str = "vault-open";
const VAULT_REMOVE: &str = "vault-remove";
const VAULT_RESTORE_GETTING_STARTED: &str = "vault-restore-getting-started";
const VAULT_ADD_REMOTE: &str = "vault-add-remote";
const VAULT_COMMIT_PUSH: &str = "vault-commit-push";
const VAULT_PULL: &str = "vault-pull";
const VAULT_RESOLVE_CONFLICTS: &str = "vault-resolve-conflicts";
const VAULT_VIEW_CHANGES: &str = "vault-view-changes";
const VAULT_INSTALL_MCP: &str = "vault-install-mcp";
const VAULT_RELOAD: &str = "vault-reload";
const VAULT_REPAIR: &str = "vault-repair";

const CUSTOM_IDS: &[&str] = &[
    APP_SETTINGS,
    APP_CHECK_FOR_UPDATES,
    FILE_NEW_NOTE,
    FILE_NEW_TYPE,
    FILE_QUICK_OPEN,
    FILE_QUICK_OPEN_ALIAS,
    FILE_SAVE,
    EDIT_FIND_IN_VAULT,
    EDIT_TOGGLE_NOTE_LIST_SEARCH,
    EDIT_TOGGLE_RAW_EDITOR,
    EDIT_TOGGLE_DIFF,
    VIEW_EDITOR_ONLY,
    VIEW_EDITOR_LIST,
    VIEW_ALL,
    VIEW_TOGGLE_PROPERTIES,
    VIEW_TOGGLE_AI_CHAT,
    VIEW_TOGGLE_BACKLINKS,
    VIEW_COMMAND_PALETTE,
    VIEW_ZOOM_IN,
    VIEW_ZOOM_OUT,
    VIEW_ZOOM_RESET,
    VIEW_GO_BACK,
    VIEW_GO_FORWARD,
    GO_ALL_NOTES,
    GO_ARCHIVED,
    GO_CHANGES,
    GO_INBOX,
    NOTE_TOGGLE_ORGANIZED,
    NOTE_ARCHIVE,
    NOTE_DELETE,
    NOTE_OPEN_IN_NEW_WINDOW,
    NOTE_RESTORE_DELETED,
    VAULT_OPEN,
    VAULT_REMOVE,
    VAULT_RESTORE_GETTING_STARTED,
    VAULT_ADD_REMOTE,
    VAULT_COMMIT_PUSH,
    VAULT_PULL,
    VAULT_RESOLVE_CONFLICTS,
    VAULT_VIEW_CHANGES,
    VAULT_INSTALL_MCP,
    VAULT_RELOAD,
    VAULT_REPAIR,
];

/// IDs of menu items that should be disabled when no note tab is active.
const NOTE_DEPENDENT_IDS: &[&str] = &[
    FILE_SAVE,
    NOTE_TOGGLE_ORGANIZED,
    NOTE_ARCHIVE,
    NOTE_DELETE,
    EDIT_TOGGLE_RAW_EDITOR,
    EDIT_TOGGLE_DIFF,
    VIEW_TOGGLE_BACKLINKS,
    NOTE_OPEN_IN_NEW_WINDOW,
];

/// IDs of menu items that depend on the note list being the active surface.
const NOTE_LIST_SEARCH_DEPENDENT_IDS: &[&str] = &[EDIT_TOGGLE_NOTE_LIST_SEARCH];

/// IDs of menu items that depend on a deleted-note preview being active.
const RESTORE_DELETED_DEPENDENT_IDS: &[&str] = &[NOTE_RESTORE_DELETED];

/// IDs of menu items that depend on having uncommitted changes.
const GIT_COMMIT_DEPENDENT_IDS: &[&str] = &[VAULT_COMMIT_PUSH];

/// IDs of menu items that depend on having merge conflicts.
const GIT_CONFLICT_DEPENDENT_IDS: &[&str] = &[VAULT_RESOLVE_CONFLICTS];

/// IDs of menu items that depend on the active vault having no remote configured.
const GIT_NO_REMOTE_DEPENDENT_IDS: &[&str] = &[VAULT_ADD_REMOTE];

type MenuResult = Result<Submenu<tauri::Wry>, Box<dyn std::error::Error>>;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum MenuLocale {
    En,
    ZhHans,
}

impl MenuLocale {
    fn from_input(input: Option<&str>) -> Self {
        let Some(value) = input else {
            return Self::En;
        };
        if value.to_lowercase().starts_with("zh") {
            Self::ZhHans
        } else {
            Self::En
        }
    }
}

struct MenuLabels {
    settings: &'static str,
    check_updates: &'static str,
    file: &'static str,
    new_note: &'static str,
    new_type: &'static str,
    quick_open: &'static str,
    quick_open_alias_macos: &'static str,
    quick_open_alias_other: &'static str,
    save: &'static str,
    edit: &'static str,
    find_in_vault: &'static str,
    toggle_note_list_search: &'static str,
    toggle_diff: &'static str,
    view: &'static str,
    editor_only: &'static str,
    editor_list: &'static str,
    all_panels: &'static str,
    toggle_properties: &'static str,
    command_palette: &'static str,
    zoom_in: &'static str,
    zoom_out: &'static str,
    zoom_reset: &'static str,
    go: &'static str,
    all_notes: &'static str,
    archived: &'static str,
    changes: &'static str,
    inbox: &'static str,
    go_back: &'static str,
    go_forward: &'static str,
    note: &'static str,
    toggle_organized: &'static str,
    archive_note: &'static str,
    delete_note: &'static str,
    restore_deleted_note: &'static str,
    open_new_window: &'static str,
    toggle_raw_editor: &'static str,
    toggle_ai_panel: &'static str,
    toggle_backlinks: &'static str,
    vault: &'static str,
    open_vault: &'static str,
    remove_vault: &'static str,
    restore_getting_started: &'static str,
    add_remote: &'static str,
    commit_push: &'static str,
    pull: &'static str,
    resolve_conflicts: &'static str,
    view_changes: &'static str,
    install_mcp: &'static str,
    reload: &'static str,
    repair: &'static str,
    window: &'static str,
}

fn menu_labels(locale: MenuLocale) -> MenuLabels {
    match locale {
        MenuLocale::En => MenuLabels {
            settings: "Settings...",
            check_updates: "Check for Updates...",
            file: "File",
            new_note: "New Note",
            new_type: "New Type",
            quick_open: "Quick Open",
            quick_open_alias_macos: "Quick Open (Cmd+O)",
            quick_open_alias_other: "Quick Open (Ctrl+O)",
            save: "Save",
            edit: "Edit",
            find_in_vault: "Find in Vault",
            toggle_note_list_search: "Toggle Note List Search",
            toggle_diff: "Toggle Diff Mode",
            view: "View",
            editor_only: "Editor Only",
            editor_list: "Editor + Notes",
            all_panels: "All Panels",
            toggle_properties: "Toggle Properties Panel",
            command_palette: "Command Palette",
            zoom_in: "Zoom In",
            zoom_out: "Zoom Out",
            zoom_reset: "Actual Size",
            go: "Go",
            all_notes: "All Notes",
            archived: "Archived",
            changes: "Changes",
            inbox: "Inbox",
            go_back: "Go Back",
            go_forward: "Go Forward",
            note: "Note",
            toggle_organized: "Toggle Organized",
            archive_note: "Archive Note",
            delete_note: "Delete Note",
            restore_deleted_note: "Restore Deleted Note",
            open_new_window: "Open in New Window",
            toggle_raw_editor: "Toggle Raw Editor",
            toggle_ai_panel: "Toggle AI Panel",
            toggle_backlinks: "Toggle Backlinks",
            vault: "Vault",
            open_vault: "Open Vault…",
            remove_vault: "Remove Vault from List",
            restore_getting_started: "Restore Getting Started",
            add_remote: "Add Remote…",
            commit_push: "Commit & Push",
            pull: "Pull from Remote",
            resolve_conflicts: "Resolve Conflicts",
            view_changes: "View Pending Changes",
            install_mcp: "Set Up External AI Tools…",
            reload: "Reload Vault",
            repair: "Repair Vault",
            window: "Window",
        },
        MenuLocale::ZhHans => MenuLabels {
            settings: "设置...",
            check_updates: "检查更新...",
            file: "文件",
            new_note: "新建笔记",
            new_type: "新建类型",
            quick_open: "快速打开",
            quick_open_alias_macos: "快速打开 (Cmd+O)",
            quick_open_alias_other: "快速打开 (Ctrl+O)",
            save: "保存",
            edit: "编辑",
            find_in_vault: "在知识库中查找",
            toggle_note_list_search: "切换笔记列表搜索",
            toggle_diff: "切换差异模式",
            view: "视图",
            editor_only: "仅编辑器",
            editor_list: "编辑器 + 笔记",
            all_panels: "全部面板",
            toggle_properties: "切换属性面板",
            command_palette: "命令面板",
            zoom_in: "放大",
            zoom_out: "缩小",
            zoom_reset: "实际大小",
            go: "前往",
            all_notes: "全部笔记",
            archived: "已归档",
            changes: "改动",
            inbox: "收件箱",
            go_back: "后退",
            go_forward: "前进",
            note: "笔记",
            toggle_organized: "切换已整理",
            archive_note: "归档笔记",
            delete_note: "删除笔记",
            restore_deleted_note: "恢复已删除笔记",
            open_new_window: "在新窗口打开",
            toggle_raw_editor: "切换源码编辑器",
            toggle_ai_panel: "切换 AI 面板",
            toggle_backlinks: "切换反向链接",
            vault: "知识库",
            open_vault: "打开知识库…",
            remove_vault: "从列表移除知识库",
            restore_getting_started: "恢复入门示例",
            add_remote: "添加远程仓库…",
            commit_push: "提交并推送",
            pull: "从远端拉取",
            resolve_conflicts: "解决冲突",
            view_changes: "查看待处理改动",
            install_mcp: "设置外部 AI 工具…",
            reload: "重新加载知识库",
            repair: "修复知识库",
            window: "窗口",
        },
    }
}

fn build_app_menu(app: &AppHandle, labels: &MenuLabels) -> MenuResult {
    let settings_item = MenuItemBuilder::new(labels.settings)
        .id(APP_SETTINGS)
        .accelerator("CmdOrCtrl+,")
        .build(app)?;
    let check_updates_item = MenuItemBuilder::new(labels.check_updates)
        .id(APP_CHECK_FOR_UPDATES)
        .build(app)?;

    Ok(SubmenuBuilder::new(app, "Tolaria")
        .about(None)
        .separator()
        .item(&check_updates_item)
        .separator()
        .item(&settings_item)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?)
}

fn build_file_menu(app: &AppHandle, labels: &MenuLabels) -> MenuResult {
    let quick_open_alias_label = if cfg!(target_os = "macos") {
        labels.quick_open_alias_macos
    } else {
        labels.quick_open_alias_other
    };
    let new_note = MenuItemBuilder::new(labels.new_note)
        .id(FILE_NEW_NOTE)
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let new_type = MenuItemBuilder::new(labels.new_type)
        .id(FILE_NEW_TYPE)
        .build(app)?;
    let quick_open = MenuItemBuilder::new(labels.quick_open)
        .id(FILE_QUICK_OPEN)
        .accelerator("CmdOrCtrl+P")
        .build(app)?;
    let quick_open_alias = MenuItemBuilder::new(quick_open_alias_label)
        .id(FILE_QUICK_OPEN_ALIAS)
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let save = MenuItemBuilder::new(labels.save)
        .id(FILE_SAVE)
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    Ok(SubmenuBuilder::new(app, labels.file)
        .item(&new_note)
        .item(&new_type)
        .item(&quick_open)
        .item(&quick_open_alias)
        .separator()
        .item(&save)
        .build()?)
}

fn build_edit_menu(app: &AppHandle, labels: &MenuLabels) -> MenuResult {
    let find_in_vault = MenuItemBuilder::new(labels.find_in_vault)
        .id(EDIT_FIND_IN_VAULT)
        .accelerator("CmdOrCtrl+Shift+F")
        .build(app)?;
    let toggle_note_list_search = MenuItemBuilder::new(labels.toggle_note_list_search)
        .id(EDIT_TOGGLE_NOTE_LIST_SEARCH)
        .accelerator("CmdOrCtrl+F")
        .enabled(false)
        .build(app)?;
    let toggle_diff = MenuItemBuilder::new(labels.toggle_diff)
        .id(EDIT_TOGGLE_DIFF)
        .build(app)?;

    Ok(SubmenuBuilder::new(app, labels.edit)
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .separator()
        .select_all()
        .separator()
        .item(&find_in_vault)
        .item(&toggle_note_list_search)
        .item(&toggle_diff)
        .build()?)
}

fn build_view_menu(app: &AppHandle, labels: &MenuLabels) -> MenuResult {
    let editor_only = MenuItemBuilder::new(labels.editor_only)
        .id(VIEW_EDITOR_ONLY)
        .accelerator("CmdOrCtrl+1")
        .build(app)?;
    let editor_list = MenuItemBuilder::new(labels.editor_list)
        .id(VIEW_EDITOR_LIST)
        .accelerator("CmdOrCtrl+2")
        .build(app)?;
    let all_panels = MenuItemBuilder::new(labels.all_panels)
        .id(VIEW_ALL)
        .accelerator("CmdOrCtrl+3")
        .build(app)?;
    // Keep Cmd+Shift+I on the renderer path. The menu item stays available,
    // but the native accelerator has proven unreliable for this command.
    let toggle_properties = MenuItemBuilder::new(labels.toggle_properties)
        .id(VIEW_TOGGLE_PROPERTIES)
        .build(app)?;
    let command_palette = MenuItemBuilder::new(labels.command_palette)
        .id(VIEW_COMMAND_PALETTE)
        .accelerator("CmdOrCtrl+K")
        .build(app)?;
    let zoom_in = MenuItemBuilder::new(labels.zoom_in)
        .id(VIEW_ZOOM_IN)
        .accelerator("CmdOrCtrl+=")
        .build(app)?;
    let zoom_out = MenuItemBuilder::new(labels.zoom_out)
        .id(VIEW_ZOOM_OUT)
        .accelerator("CmdOrCtrl+-")
        .build(app)?;
    let zoom_reset = MenuItemBuilder::new(labels.zoom_reset)
        .id(VIEW_ZOOM_RESET)
        .accelerator("CmdOrCtrl+0")
        .build(app)?;

    Ok(SubmenuBuilder::new(app, labels.view)
        .item(&editor_only)
        .item(&editor_list)
        .item(&all_panels)
        .separator()
        .item(&toggle_properties)
        .separator()
        .item(&zoom_in)
        .item(&zoom_out)
        .item(&zoom_reset)
        .separator()
        .item(&command_palette)
        .build()?)
}

fn build_go_menu(app: &AppHandle, labels: &MenuLabels) -> MenuResult {
    let all_notes = MenuItemBuilder::new(labels.all_notes)
        .id(GO_ALL_NOTES)
        .build(app)?;
    let archived = MenuItemBuilder::new(labels.archived)
        .id(GO_ARCHIVED)
        .build(app)?;
    let changes = MenuItemBuilder::new(labels.changes)
        .id(GO_CHANGES)
        .build(app)?;
    let inbox = MenuItemBuilder::new(labels.inbox).id(GO_INBOX).build(app)?;
    let go_back = MenuItemBuilder::new(labels.go_back)
        .id(VIEW_GO_BACK)
        .accelerator("CmdOrCtrl+Left")
        .build(app)?;
    let go_forward = MenuItemBuilder::new(labels.go_forward)
        .id(VIEW_GO_FORWARD)
        .accelerator("CmdOrCtrl+Right")
        .build(app)?;

    Ok(SubmenuBuilder::new(app, labels.go)
        .item(&all_notes)
        .item(&archived)
        .item(&changes)
        .item(&inbox)
        .separator()
        .item(&go_back)
        .item(&go_forward)
        .build()?)
}

fn build_note_menu(app: &AppHandle, labels: &MenuLabels) -> MenuResult {
    let toggle_organized = MenuItemBuilder::new(labels.toggle_organized)
        .id(NOTE_TOGGLE_ORGANIZED)
        .accelerator("CmdOrCtrl+E")
        .build(app)?;
    let archive_note = MenuItemBuilder::new(labels.archive_note)
        .id(NOTE_ARCHIVE)
        .build(app)?;
    let delete_note = MenuItemBuilder::new(labels.delete_note)
        .id(NOTE_DELETE)
        .accelerator("CmdOrCtrl+Backspace")
        .build(app)?;
    let restore_deleted_note = MenuItemBuilder::new(labels.restore_deleted_note)
        .id(NOTE_RESTORE_DELETED)
        .enabled(false)
        .build(app)?;
    let open_new_window = MenuItemBuilder::new(labels.open_new_window)
        .id(NOTE_OPEN_IN_NEW_WINDOW)
        .accelerator("CmdOrCtrl+Shift+O")
        .build(app)?;
    let toggle_raw_editor = MenuItemBuilder::new(labels.toggle_raw_editor)
        .id(EDIT_TOGGLE_RAW_EDITOR)
        .accelerator("CmdOrCtrl+\\")
        .build(app)?;
    let toggle_ai_chat = MenuItemBuilder::new(labels.toggle_ai_panel)
        .id(VIEW_TOGGLE_AI_CHAT)
        .accelerator("CmdOrCtrl+Shift+L")
        .build(app)?;
    let toggle_backlinks = MenuItemBuilder::new(labels.toggle_backlinks)
        .id(VIEW_TOGGLE_BACKLINKS)
        .build(app)?;

    Ok(SubmenuBuilder::new(app, labels.note)
        .item(&toggle_organized)
        .item(&archive_note)
        .item(&delete_note)
        .item(&restore_deleted_note)
        .separator()
        .item(&open_new_window)
        .separator()
        .item(&toggle_raw_editor)
        .item(&toggle_ai_chat)
        .item(&toggle_backlinks)
        .build()?)
}

fn build_vault_menu(app: &AppHandle, labels: &MenuLabels) -> MenuResult {
    let open_vault = MenuItemBuilder::new(labels.open_vault)
        .id(VAULT_OPEN)
        .build(app)?;
    let remove_vault = MenuItemBuilder::new(labels.remove_vault)
        .id(VAULT_REMOVE)
        .build(app)?;
    let restore_getting_started = MenuItemBuilder::new(labels.restore_getting_started)
        .id(VAULT_RESTORE_GETTING_STARTED)
        .build(app)?;
    let add_remote = MenuItemBuilder::new(labels.add_remote)
        .id(VAULT_ADD_REMOTE)
        .enabled(false)
        .build(app)?;
    let commit_push = MenuItemBuilder::new(labels.commit_push)
        .id(VAULT_COMMIT_PUSH)
        .build(app)?;
    let pull = MenuItemBuilder::new(labels.pull)
        .id(VAULT_PULL)
        .build(app)?;
    let resolve_conflicts = MenuItemBuilder::new(labels.resolve_conflicts)
        .id(VAULT_RESOLVE_CONFLICTS)
        .enabled(false)
        .build(app)?;
    let view_changes = MenuItemBuilder::new(labels.view_changes)
        .id(VAULT_VIEW_CHANGES)
        .build(app)?;
    let install_mcp = MenuItemBuilder::new(labels.install_mcp)
        .id(VAULT_INSTALL_MCP)
        .build(app)?;
    let reload = MenuItemBuilder::new(labels.reload)
        .id(VAULT_RELOAD)
        .build(app)?;
    let repair = MenuItemBuilder::new(labels.repair)
        .id(VAULT_REPAIR)
        .build(app)?;

    Ok(SubmenuBuilder::new(app, labels.vault)
        .item(&open_vault)
        .item(&remove_vault)
        .item(&restore_getting_started)
        .separator()
        .item(&add_remote)
        .item(&commit_push)
        .item(&pull)
        .item(&resolve_conflicts)
        .item(&view_changes)
        .separator()
        .item(&reload)
        .item(&repair)
        .item(&install_mcp)
        .build()?)
}

fn build_window_menu(app: &AppHandle, labels: &MenuLabels) -> MenuResult {
    Ok(SubmenuBuilder::new(app, labels.window)
        .minimize()
        .maximize()
        .separator()
        .close_window()
        .build()?)
}

pub fn setup_menu(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    set_menu_locale(&app.handle(), None)?;

    app.on_menu_event(|app_handle, event| {
        let id = event.id().0.as_str();
        let _ = emit_custom_menu_event(app_handle, id);
    });

    Ok(())
}

pub fn set_menu_locale(
    app: &AppHandle,
    locale: Option<&str>,
) -> Result<(), Box<dyn std::error::Error>> {
    let labels = menu_labels(MenuLocale::from_input(locale));
    let app_menu = build_app_menu(app, &labels)?;
    let file_menu = build_file_menu(app, &labels)?;
    let edit_menu = build_edit_menu(app, &labels)?;
    let view_menu = build_view_menu(app, &labels)?;
    let go_menu = build_go_menu(app, &labels)?;
    let note_menu = build_note_menu(app, &labels)?;
    let vault_menu = build_vault_menu(app, &labels)?;
    let window_menu = build_window_menu(app, &labels)?;

    let menu = MenuBuilder::new(app)
        .item(&app_menu)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&go_menu)
        .item(&note_menu)
        .item(&vault_menu)
        .item(&window_menu)
        .build()?;

    app.set_menu(menu)?;

    Ok(())
}

pub fn emit_custom_menu_event(app_handle: &AppHandle, id: &str) -> Result<(), String> {
    if !CUSTOM_IDS.contains(&id) {
        return Err(format!("Unknown custom menu event: {id}"));
    }
    let emitted_id = match id {
        FILE_QUICK_OPEN_ALIAS => FILE_QUICK_OPEN,
        _ => id,
    };
    app_handle
        .emit("menu-event", emitted_id)
        .map_err(|err| format!("Failed to emit menu-event {emitted_id}: {err}"))
}

fn set_items_enabled(app_handle: &AppHandle, ids: &[&str], enabled: bool) {
    let Some(menu) = app_handle.menu() else {
        return;
    };
    for id in ids {
        if let Some(MenuItemKind::MenuItem(mi)) = menu.get(*id) {
            let _ = mi.set_enabled(enabled);
        }
    }
}

/// Enable or disable menu items that depend on having an active note tab.
pub fn set_note_items_enabled(app_handle: &AppHandle, enabled: bool) {
    set_items_enabled(app_handle, NOTE_DEPENDENT_IDS, enabled);
}

/// Enable or disable menu items that depend on the note list being the active surface.
pub fn set_note_list_search_items_enabled(app_handle: &AppHandle, enabled: bool) {
    set_items_enabled(app_handle, NOTE_LIST_SEARCH_DEPENDENT_IDS, enabled);
}

/// Enable or disable menu items that depend on having uncommitted changes.
pub fn set_git_commit_items_enabled(app_handle: &AppHandle, enabled: bool) {
    set_items_enabled(app_handle, GIT_COMMIT_DEPENDENT_IDS, enabled);
}

/// Enable or disable menu items that depend on having merge conflicts.
pub fn set_git_conflict_items_enabled(app_handle: &AppHandle, enabled: bool) {
    set_items_enabled(app_handle, GIT_CONFLICT_DEPENDENT_IDS, enabled);
}

/// Enable or disable menu items that depend on the active vault having no remote.
pub fn set_git_no_remote_items_enabled(app_handle: &AppHandle, enabled: bool) {
    set_items_enabled(app_handle, GIT_NO_REMOTE_DEPENDENT_IDS, enabled);
}

/// Enable or disable menu items that depend on a deleted note preview being active.
pub fn set_restore_deleted_item_enabled(app_handle: &AppHandle, enabled: bool) {
    set_items_enabled(app_handle, RESTORE_DELETED_DEPENDENT_IDS, enabled);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn custom_ids_include_all_constants() {
        let expected = [
            APP_SETTINGS,
            APP_CHECK_FOR_UPDATES,
            FILE_NEW_NOTE,
            FILE_NEW_TYPE,
            FILE_QUICK_OPEN,
            FILE_SAVE,
            EDIT_FIND_IN_VAULT,
            EDIT_TOGGLE_NOTE_LIST_SEARCH,
            EDIT_TOGGLE_RAW_EDITOR,
            EDIT_TOGGLE_DIFF,
            VIEW_EDITOR_ONLY,
            VIEW_EDITOR_LIST,
            VIEW_ALL,
            VIEW_TOGGLE_PROPERTIES,
            VIEW_TOGGLE_AI_CHAT,
            VIEW_TOGGLE_BACKLINKS,
            VIEW_COMMAND_PALETTE,
            VIEW_ZOOM_IN,
            VIEW_ZOOM_OUT,
            VIEW_ZOOM_RESET,
            VIEW_GO_BACK,
            VIEW_GO_FORWARD,
            GO_ALL_NOTES,
            GO_ARCHIVED,
            GO_CHANGES,
            NOTE_ARCHIVE,
            NOTE_DELETE,
            NOTE_OPEN_IN_NEW_WINDOW,
            VAULT_OPEN,
            VAULT_REMOVE,
            VAULT_RESTORE_GETTING_STARTED,
            VAULT_ADD_REMOTE,
            VAULT_COMMIT_PUSH,
            VAULT_PULL,
            VAULT_RESOLVE_CONFLICTS,
            VAULT_VIEW_CHANGES,
            VAULT_INSTALL_MCP,
            VAULT_RELOAD,
        ];
        for id in &expected {
            assert!(CUSTOM_IDS.contains(id), "missing custom ID: {id}");
        }
    }

    #[test]
    fn note_dependent_ids_are_subset_of_custom_ids() {
        for id in NOTE_DEPENDENT_IDS {
            assert!(
                CUSTOM_IDS.contains(id),
                "note-dependent ID {id} not in CUSTOM_IDS"
            );
        }
    }

    #[test]
    fn note_list_search_dependent_ids_are_subset_of_custom_ids() {
        for id in NOTE_LIST_SEARCH_DEPENDENT_IDS {
            assert!(
                CUSTOM_IDS.contains(id),
                "note-list-search-dependent ID {id} not in CUSTOM_IDS"
            );
        }
    }

    #[test]
    fn git_dependent_ids_are_subset_of_custom_ids() {
        for id in GIT_COMMIT_DEPENDENT_IDS {
            assert!(
                CUSTOM_IDS.contains(id),
                "git-commit-dependent ID {id} not in CUSTOM_IDS"
            );
        }
        for id in GIT_CONFLICT_DEPENDENT_IDS {
            assert!(
                CUSTOM_IDS.contains(id),
                "git-conflict-dependent ID {id} not in CUSTOM_IDS"
            );
        }
        for id in GIT_NO_REMOTE_DEPENDENT_IDS {
            assert!(
                CUSTOM_IDS.contains(id),
                "git-no-remote-dependent ID {id} not in CUSTOM_IDS"
            );
        }
    }

    #[test]
    fn no_duplicate_custom_ids() {
        let mut seen = std::collections::HashSet::new();
        for id in CUSTOM_IDS {
            assert!(seen.insert(id), "duplicate custom ID: {id}");
        }
    }
}
