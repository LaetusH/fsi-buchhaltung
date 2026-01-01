import type { PageName } from '~/types/page'

export const usePage = () => {
  const currentPage = useState<PageName>('currentPage', () => 'Home')

  const setPage = (page: PageName) => {
    currentPage.value = page
  }

  return { currentPage, setPage }
}