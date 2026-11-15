import { Component } from 'react'
import type { ReactNode } from 'react'

export class MapErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void; message?: string; locked?: boolean }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div role="alert">
      <p>{this.props.message ?? 'Map could not be loaded.'}</p>
      <button type="button" className="viewer-retry" disabled={this.props.locked} onClick={this.props.onRetry}>Retry Image</button>
    </div>
    return this.props.children
  }
}
