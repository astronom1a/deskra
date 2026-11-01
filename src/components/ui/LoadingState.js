import React from 'react'

const baseText = {
  fontFamily: 'monospace',
  letterSpacing: 0,
}

export function PageLoader({ label = 'memuat halaman...' } = {}) {
  return React.createElement(
    'div',
    {
      role: 'status',
      'aria-live': 'polite',
      style: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#f0f0f0',
        padding: 24,
      },
    },
    React.createElement(
      'div',
      {
        style: {
          width: 'min(320px, 100%)',
          display: 'grid',
          gap: 14,
          justifyItems: 'center',
        },
      },
      React.createElement(
        'div',
        {
          className: 'deskra-loader-orbit',
          'aria-hidden': 'true',
        },
        React.createElement('span', null)
      ),
      React.createElement(
        'div',
        {
          style: {
            ...baseText,
            color: 'rgba(255,255,255,0.72)',
            fontSize: 12,
            fontWeight: 700,
          },
        },
        label
      ),
      React.createElement('div', {
        className: 'deskra-scanline',
        'aria-hidden': 'true',
      })
    )
  )
}

export function InlineLoader({ label = 'memuat...' } = {}) {
  return React.createElement(
    'div',
    {
      role: 'status',
      'aria-live': 'polite',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        color: 'rgba(255,255,255,0.56)',
        fontFamily: 'monospace',
        fontSize: 12,
      },
    },
    React.createElement('span', {
      className: 'deskra-loader-dot',
      'aria-hidden': 'true',
    }),
    React.createElement(
      'span',
      { className: 'deskra-loading-text' },
      label,
      React.createElement(
        'span',
        {
          className: 'deskra-loading-dots',
          'aria-hidden': 'true',
        },
        [0, 1, 2].map(i =>
          React.createElement('span', {
            className: 'deskra-loading-dot',
            key: i,
            style: { animationDelay: `${i * 0.18}s` },
          })
        )
      )
    )
  )
}

export function CardGridSkeleton({ count = 3, label = 'menyiapkan data' } = {}) {
  const cardEls = Array.from({ length: count }, (_, i) =>
    React.createElement(
      'div',
      {
        key: i,
        style: {
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 4,
          padding: '16px 20px',
          display: 'grid',
          gap: 10,
        },
      },
      React.createElement('span', { className: 'deskra-skeleton-cell', style: { width: '40%', height: 10 } }),
      React.createElement('span', { className: 'deskra-skeleton-cell', style: { width: '65%', height: 22 } }),
      React.createElement('span', { className: 'deskra-skeleton-cell', style: { width: '50%', height: 10 } })
    )
  )

  return React.createElement(
    'div',
    { role: 'status', 'aria-live': 'polite', style: { display: 'grid', gap: 12 } },
    React.createElement(InlineLoader, { label }),
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 } },
      cardEls
    )
  )
}

export function TableSkeleton({ rows = 5, columns = 4, label = 'menyiapkan data' } = {}) {
  const rowEls = Array.from({ length: rows }, (_, rowIndex) =>
    React.createElement(
      'div',
      {
        className: 'deskra-skeleton-row',
        key: rowIndex,
        style: {
          '--deskra-skeleton-columns': columns,
        },
      },
      Array.from({ length: columns }, (_, columnIndex) =>
        React.createElement('span', {
          className: 'deskra-skeleton-cell',
          key: columnIndex,
          style: {
            width: `${columnIndex === 0 ? 36 : 58 + ((rowIndex + columnIndex) % 3) * 13}%`,
          },
        })
      )
    )
  )

  return React.createElement(
    'div',
    {
      role: 'status',
      'aria-live': 'polite',
      style: {
        padding: 18,
        display: 'grid',
        gap: 12,
      },
    },
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
      },
      React.createElement(InlineLoader, { label }),
      React.createElement('div', {
        className: 'deskra-scanline deskra-scanline-compact',
        'aria-hidden': 'true',
      })
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gap: 9,
        },
      },
      rowEls
    )
  )
}
