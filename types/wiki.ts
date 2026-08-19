import type { PermissionKey } from '~/config/permissions'

export type WikiAccessLevel = 'read' | 'write' | 'admin'
/** `none` never exists in the database — it is what the resolver returns for "no access at all". */
export type WikiEffectiveLevel = 'none' | WikiAccessLevel

export type WikiScopeType = 'space' | 'article'
export type WikiGrantSubjectType = 'user' | 'role' | 'position' | 'subdivision' | 'permission'
export type WikiArticleStatus = 'draft' | 'in_review' | 'published' | 'archived'

export interface WikiSpace {
  id: number
  slug: string
  title: string
  description: string
  icon: string
  position: number
  requires_review: number
  is_archived: number
  owner_position_id: number | null
  owner_subdivision_id: number | null
  created_at?: string
  updated_at?: string
}

export interface WikiArticle {
  id: number
  space_id: number
  parent_id: number | null
  slug: string
  title: string
  summary: string
  icon: string | null
  position: number
  status: WikiArticleStatus
  content_md: string | null
  content_html: string | null
  content_text: string | null
  draft_md: string | null
  draft_updated_at: string | null
  draft_updated_by: number | null
  review_interval_days: number | null
  reviewed_at: string | null
  reviewed_by: number | null
  published_at: string | null
  owner_position_id: number | null
  owner_subdivision_id: number | null
  created_by: number
  created_at?: string
  updated_at?: string
}

/** The subject side of a grant: exactly one of `id` (user/role/position/subdivision) or `key`. */
export interface WikiGrantSubject {
  type: WikiGrantSubjectType
  id?: number | null
  key?: PermissionKey | string | null
}

export interface WikiAccessGrant {
  id: number
  scope_type: WikiScopeType
  scope_id: number
  include_descendants: number
  subject_type: WikiGrantSubjectType
  subject_id: number
  subject_key: string
  access_level: WikiAccessLevel
  created_by: number
  created_at?: string
}

/** A grant as the Zugriff tab shows it: with a readable subject label and its inheritance origin. */
export interface WikiAccessGrantView extends WikiAccessGrant {
  subject_label: string
  inherited: boolean
  origin_label: string
  owner_derived: boolean
}

export interface WikiTag {
  id: number
  slug: string
  label: string
}

export interface WikiArticleRevision {
  id: number
  article_id: number
  revision_number: number
  title: string
  summary: string
  content_md: string
  change_note: string
  created_by: number
  created_at: string
}

export interface WikiPath {
  id: number
  slug: string
  title: string
  description: string
  icon: string
  position: number
  is_published: number
}

export interface WikiPathItem {
  id: number
  path_id: number
  article_id: number
  position: number
  note: string
}

export interface WikiPathAudience {
  id: number
  path_id: number
  position_id: number | null
  subdivision_id: number | null
}

export interface WikiChecklist {
  id: number
  article_id: number
  key_slug: string
  title: string
  mode: 'personal' | 'shared'
}

export interface WikiChecklistItem {
  id: number
  checklist_id: number
  label: string
  hint: string
  target_page: string | null
  target_meta: string | null
  position: number
}

export interface WikiChecklistRun {
  id: number
  checklist_id: number
  title: string
  due_date: string | null
  closed_at: string | null
  created_by: number
  created_at: string
}

export interface WikiGlossaryTerm {
  id: number
  term: string
  short_definition: string
  article_id: number | null
}

export interface WikiPageHelpEntry {
  id: number
  page_name: string
  section_key: string
  article_id: number
  position: number
}

/** Owner of a space or article, resolved to display labels for the article header. */
export interface WikiOwner {
  position_id: number | null
  position_name: string | null
  subdivision_id: number | null
  subdivision_name: string | null
}

/** One node of the space/article tree the reader navigates. */
export interface WikiTreeArticle {
  id: number
  space_id: number
  parent_id: number | null
  slug: string
  title: string
  summary: string
  icon: string | null
  position: number
  status: WikiArticleStatus
  accessLevel: WikiAccessLevel
  children: WikiTreeArticle[]
}

export interface WikiTreeSpace {
  id: number
  slug: string
  title: string
  description: string
  icon: string
  position: number
  requires_review: number
  accessLevel: WikiAccessLevel
  articles: WikiTreeArticle[]
}

export interface WikiBreadcrumb {
  id: number | null
  slug: string
  title: string
  type: WikiScopeType
}

export interface WikiArticleLink {
  id: number
  slug: string
  spaceSlug: string
  title: string
}

export interface WikiAttachment {
  attachmentId: number
  fileId: number
  name: string
  mimeType: string
  size: number
  uploadedAt: string | null
}

/** Everything the reader view of one article needs. */
export interface WikiArticleDetail {
  id: number
  spaceId: number
  spaceSlug: string
  spaceTitle: string
  parentId: number | null
  slug: string
  title: string
  summary: string
  icon: string | null
  status: WikiArticleStatus
  contentHtml: string
  publishedAt: string | null
  updatedAt: string | null
  reviewedAt: string | null
  breadcrumbs: WikiBreadcrumb[]
  children: WikiArticleLink[]
  prev: WikiArticleLink | null
  next: WikiArticleLink | null
  tags: WikiTag[]
  attachments: WikiAttachment[]
  owner: WikiOwner
  accessLevel: WikiAccessLevel
  hasDraft: boolean
  isStale: boolean
  requiresReview: boolean
}

export interface WikiSearchHit {
  id: number
  slug: string
  spaceId: number
  spaceSlug: string
  spaceTitle: string
  title: string
  summary: string
  snippet: string
}
