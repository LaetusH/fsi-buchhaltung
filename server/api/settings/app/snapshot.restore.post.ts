import { createError, defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { readMultipart } from '~/server/utils/api/request'
import {
  decryptDatabaseSnapshotBuffer,
  previewFilesArchiveForSnapshot,
  restoreDatabaseSnapshot,
  restoreFilesArchiveForSnapshot,
} from '~/server/utils/databaseSnapshots'

interface RestoreSnapshotSuccess {
  ok: true
  tables: number
  rows: number
  files: number
}

interface RestoreSnapshotError {
  ok: false
  error: string
}

export type RestoreSnapshotResponse = RestoreSnapshotSuccess | RestoreSnapshotError

export default defineEventHandler(async (event): Promise<RestoreSnapshotResponse> => {
  const current = await requirePermission(event, 'settings.app.snapshots.manage', { touch: false })
  if (!current.ok) return current

  try {
    const contentType = event.node.req.headers['content-type'] || ''
    if (contentType.includes('multipart/form-data')) {
      const multipart = await readMultipart(event)
      if (!multipart) throw new Error('Missing restore payload')

      const snapshotFile = multipart.formData.find(field => field.name === 'snapshotFile' && field.filename)
      if (!snapshotFile) throw new Error('Missing encrypted snapshot')

      const password = multipart.getField('password')
      const snapshot = JSON.parse(decryptDatabaseSnapshotBuffer(snapshotFile.data, password).toString('utf8'))
      const archiveFile = multipart.formData.find(field => field.name === 'archive' && field.type && field.filename)
      if (archiveFile) previewFilesArchiveForSnapshot(snapshot, archiveFile.data)

      const dbResult = await restoreDatabaseSnapshot(snapshot)
      const filesResult = archiveFile
        ? await restoreFilesArchiveForSnapshot(snapshot, archiveFile.data)
        : { ok: true as const, files: 0 }

      return { ...dbResult, files: filesResult.files }
    }

    throw new Error('Encrypted snapshot upload is required')
  } catch (err: any) {
    throw createError({ statusCode: 400, statusMessage: 'Failed to restore database snapshot', message: String(err?.message || err) })
  }
})
