import { useQuery } from '@tanstack/react-query'

export function useFetch<T>(key: string, url: string){
  return useQuery({
    queryKey: [key],
    queryFn: async () => {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`Error fetching ${url}: ${r.status} ${r.statusText}`)
      return r.json() as Promise<T>
    }
  })
}