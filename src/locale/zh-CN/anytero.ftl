## Menus

anytero-collection-menu-sync = 
    .label = 同步条目至 Notion
anytero-item-menu-sync = 
    .label = 同步到 Notion
anytero-tools-menu-preferences = 
    .label = Anytero 首选项…

## Notion preferences

anytero-preferences-notion-groupbox-heading = Notion 连接
anytero-preferences-notion-connect-button = 连接到 Notion
anytero-preferences-notion-disconnect-button = 断开连接…
anytero-preferences-notion-disconnect-dialog-title = 断开 Notion 工作区
anytero-preferences-notion-disconnect-dialog-text = 断开 Notion 工作区连接将阻止进一步同步。它不会删除任何已同步的内容。
anytero-preferences-notion-upgrade-button = 升级连接…
anytero-preferences-notion-upgrade-dialog-title = 升级 Notion 连接
anytero-preferences-notion-upgrade-dialog-text = Anytero 已发展成为 Notion 公共集成，从而实现了增强的功能和安全性。要升级，请单击“确定”，您将被重定向到 Notion 以授权新的 Anytero 集成。完成此一次性过程后，您可以安全地删除之前的内部集成。有关更多详细信息，请参阅 Anytero README。
anytero-preferences-notion-token-label = 连接令牌：
anytero-preferences-notion-token-input = 
    .placeholder = 在此处粘贴您的连接令牌
anytero-preferences-notion-workspace = 工作区： { $workspace-name }
anytero-preferences-notion-database = 数据库：

## Property preferences

anytero-preferences-properties-groupbox-heading = 属性偏好
anytero-preferences-properties-groupbox-description = 自定义项目属性如何同步到 Notion。
anytero-preferences-page-title-format = 概念页面标题：

## Page title format options

anytero-page-title-format-item-author-date-citation = 
    .label = 项目作者-日期引文
anytero-page-title-format-item-citation-key = 
    .label = 项目引文密钥 (需要 Better BibTeX)
anytero-page-title-format-item-full-citation = 
    .label = 项目完整引用
anytero-page-title-format-item-in-text-citation = 
    .label = 项目文本引用
anytero-page-title-format-item-short-title = 
    .label = 项目短标题
anytero-page-title-format-item-title = 
    .label = 项目标题

## Sync preferences

anytero-preferences-sync-groupbox-heading = 同步首选项
anytero-preferences-sync-groupbox-description1 = Anytero 将监控下面启用的集合。将条目添加到该启用的集合中以及当条目被修改时，都将同步到 Notion。
anytero-preferences-sync-groupbox-description2 = 要启用/禁用集合，请选择该行并按 { "[Enter]" } 键或双击该行。要选择多行，请按住 { "[Shift]" } 然后单击。
anytero-preferences-collection-column = 集合
anytero-preferences-sync-enabled-column = 启用同步
anytero-preferences-sync-on-modify-items = 
    .label = 当修改条目时同步
anytero-preferences-sync-notes = 
    .label = 同步笔记

## Progress window

anytero-progress-headline = 将项目同步到 Notion…
anytero-progress-item = 项目 { $step } / { $total }

## Errors

anytero-error-missing-notion-database = 未选择 Notion 数据库。请在 Anytero 偏好设置中选择您的数据库。
anytero-error-missing-notion-token = 未获得 Notion 授权。请在 Anytero 偏好设置中连接到 Notion。
anytero-error-missing-pref = { $pref } 缺少值。请在 Anytero 偏好设置中输入该值。
anytero-error-no-notion-databases = 没有可访问的 Notion 数据库。
anytero-error-note-conversion-failed = 无法将笔记内容转换为 Notion 块。
anytero-error-note-parent-not-synced = 无法同步注释，因为其父项尚未同步。
anytero-error-note-sync-failed = 无法将笔记同步到 Notion。
anytero-error-note-without-parent = 没有父项则无法同步注释。
anytero-error-notion-link-attachment = 无法创建 Notion 链接附件。这将导致重复的 Notion 页面。请确保在 www.notion.so/my-integrations 上为 Anytero 集成启用了“读取内容”功能。
