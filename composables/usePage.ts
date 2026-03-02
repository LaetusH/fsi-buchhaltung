import type { PageName } from '~/types/page'

const currentPage = ref<PageName>('Home')
const pageMeta = ref<Record<string, any> | null>(null)

export const usePage = () => {
  const setPage = (page: PageName, meta?: Record<string, any>) => {
    currentPage.value = page
    pageMeta.value = meta || null
  }

  return { currentPage, setPage, pageMeta }
}