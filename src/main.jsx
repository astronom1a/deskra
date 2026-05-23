import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '2rem', background: '#f9fafb' }}>
          <div style={{ maxWidth: 480, background: '#fff', border: '1px solid #fca5a5', borderRadius: 8, padding: '1.5rem' }}>
            <h2 style={{ color: '#dc2626', marginTop: 0 }}>Gagal memuat aplikasi</h2>
            <pre style={{ whiteSpace: 'pre-wrap', color: '#374151', fontSize: 13 }}>{this.state.error.message}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
