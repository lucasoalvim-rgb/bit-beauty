"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Bottom-sheet com arrastar-para-fechar + interceptação do botão "voltar".
 * Empurra um estado no history ao abrir e fecha no popstate.
 */
/** Larguras do cartão quando centralizado no desktop (no mobile é sempre full). */
const SIZE_MAP = {
  md: "max-w-md",
  lg: "max-w-md sm:max-w-2xl",
  xl: "max-w-md sm:max-w-5xl",
} as const

export function Sheet({
  open,
  onClose,
  children,
  /** cor da faixa da alça — deve casar com a 1ª seção abaixo dela */
  handleClassName = "bg-white",
  handleBarClassName = "bg-[var(--ink)]/20",
  /** largura do cartão no desktop */
  size = "md",
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  handleClassName?: string
  handleBarClassName?: string
  size?: keyof typeof SIZE_MAP
}) {
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)

  // Mantém a referência mais recente do onClose sem recriar o efeito de history.
  // Se o efeito dependesse de `onClose`, cada re-render do pai (ex.: o refresh
  // automático que o Next dispara após uma Server Action) re-executaria o
  // cleanup → history.back() → popstate, fechando o sheet indevidamente.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    window.history.pushState({ glowSheet: true }, "")
    const onPop = () => onCloseRef.current()
    window.addEventListener("popstate", onPop)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("popstate", onPop)
      document.body.style.overflow = prevOverflow
      if (window.history.state?.glowSheet) window.history.back()
    }
  }, [open])

  if (!open) return null

  function onPointerDown(e: React.PointerEvent) {
    startY.current = e.clientY
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startY.current === null) return
    const dy = e.clientY - startY.current
    if (dy > 0) setDragY(dy)
  }
  function onPointerUp() {
    if (dragY > 110) onClose()
    setDragY(0)
    startY.current = null
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex h-[100dvh] items-end justify-center bg-[var(--ink)]/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className={`glow-up flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2.5rem] border-2 border-[var(--ink)] bg-white sm:max-h-[90dvh] sm:rounded-[2.5rem] ${SIZE_MAP[size]}`}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: startY.current === null ? "transform .25s cubic-bezier(.2,.8,.2,1)" : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Alça de arraste — só no mobile. No desktop o sheet é centralizado e
            arrastar para fechar não é um gesto comum, então é ocultada (o que
            também desativa a função de arraste, presa a estes handlers). */}
        <div
          className={`flex flex-shrink-0 cursor-grab touch-none justify-center pt-3 pb-2 active:cursor-grabbing sm:hidden ${handleClassName}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <span className={`h-1.5 w-12 rounded-full ${handleBarClassName}`} />
        </div>
        {children}
      </div>
    </div>
  )
}
