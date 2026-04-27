'use client'

import React from 'react'

// Renders text with URLs automatically converted to clickable hyperlinks
const URL_REGEX = /(https?:\/\/[^\s]+)/g

export default function AutoLinkText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_REGEX)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1f7a8c] underline underline-offset-2 hover:text-[#155f6e] break-all transition-colors"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  )
}
