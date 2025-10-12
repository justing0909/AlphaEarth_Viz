import Link from 'next/link'
import { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }){
  return (
    <div style={{display:'grid', gridTemplateRows:'auto 1fr', minHeight:'100vh'}}>
      <nav style={{display:'flex', gap:16, padding:12, borderBottom:'1px solid #eee'}}>
        <Link href='/'>Overview</Link>
        <Link href='/conceptual'>Conceptual Map</Link>
        <Link href='/geo'>Geo Importance</Link>
        <Link href='/compare'>Compare</Link>
        <Link href='/chat'>Chat</Link>
      </nav>
      <main style={{padding:16}}>{children}</main>
    </div>
  )
}
