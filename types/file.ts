export interface FileRow {
  id: number
  file_path: string
  original_name: string
  mime_type: string
  file_size: number
}

export interface FileAttachment {
  id: number
  file_id: number
}