/** User-supplied decorative background, independent of chapter data. */
export function EarthBackdrop() {
  return <div className="earth-backdrop" aria-hidden="true">
    <img className="earth-backdrop-photo" src={`${import.meta.env.BASE_URL}media/background.png`} alt="" decoding="async" draggable={false} />
  </div>
}
