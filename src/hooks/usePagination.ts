import { useState } from 'react'

export function usePagination(total: number, defaultPageSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)

  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize
  const to = Math.min(from + pageSize, total)

  const goTo = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p)
  }
  const next = () => goTo(page + 1)
  const prev = () => goTo(page - 1)
  const setPageSize = (size: number) => {
    setPageSizeState(size)
    setPage(1)
  }
  const reset = () => setPage(1)

  return {
    page,
    pageSize,
    totalPages,
    from,
    to,
    goTo,
    next,
    prev,
    setPageSize,
    reset,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}
