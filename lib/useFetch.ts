import { useQuery } from '@tanstack/react-query'

export function useFetch<T=any>(key: string, url: string){
  return useQuery({
    queryKey: [key],
    queryFn: async () => {
      const r = await fetch(url)
      return r.json() as Promise<T>
    }
  })
}
