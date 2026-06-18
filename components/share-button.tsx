"use client"

import { useState } from "react"
import { IconShare, IconCheck } from "@/components/icons"
import { shareLink } from "@/lib/share"

/**
 * Botão de compartilhar reutilizável. Dispara a Web Share API (ou copia o link)
 * e mostra um feedback temporário de "Copiado" quando cai no fallback.
 */
export function ShareButton({
  title,
  text,
  url,
  className,
  label,
  ariaLabel = "Compartilhar",
}: {
  title: string
  text?: string
  url: string
  className?: string
  label?: string
  ariaLabel?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const result = await shareLink({ title, text, url })
    if (result === "copied") {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={ariaLabel}
      className={className}
    >
      {copied ? <IconCheck className="h-5 w-5" /> : <IconShare className="h-5 w-5" />}
      {label ? <span>{copied ? "Copiado!" : label}</span> : null}
    </button>
  )
}
