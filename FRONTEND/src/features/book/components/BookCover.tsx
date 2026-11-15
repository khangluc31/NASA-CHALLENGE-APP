import { ArrowUpRight } from 'lucide-react'

export function BookCover({ onOpen, active = true }: { onOpen: () => void; active?: boolean }) {
  return <main id={active ? 'main-content' : undefined} className="landing grid items-center gap-12 lg:grid-cols-2">
    <section className="landing-copy">
      <p className="eyebrow">AN INTERACTIVE SCIENTIFIC ATLAS</p>
      <h1>Listen to our<br />changing planet.</h1>
      <p className="landing-description">Explore NASA visualizations and discover<br className="desktop-break" /> how scientific data can become sound.</p>
      <button className="open-link inline-flex items-center gap-3" onClick={onOpen}>Open the atlas <ArrowUpRight size={20} /></button>
    </section>
    <button className="book-cover" onClick={onOpen} aria-label="Open Earth Jukebox atlas">
      <span className="cover-spine" aria-hidden="true" />
      <span className="magazine-title">EARTH JUKEBOX</span>
    </button>
  </main>
}
