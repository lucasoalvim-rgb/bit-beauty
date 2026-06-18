"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X, Loader2, Share2, Check } from "lucide-react"
import { pageUrl } from "@/lib/magazine-cdn"
import { magazineShareUrl, shareLink } from "@/lib/share"
import type { Magazine } from "@/lib/types"

/** Quantas páginas pré-carregar à frente da página atual. */
const PRELOAD_AHEAD = 5
/** Quantas páginas "vazias" tolerar antes de assumir que a revista acabou. */
const PROBE_TOLERANCE = 3
/** Teto rígido de sondagem, evita loop infinito caso o CDN responda 200 sempre. */
const MAX_PROBE = 400
/** Distância mínima (px) de arraste para trocar de página. */
const SWIPE_THRESHOLD = 48

type PageState = "idle" | "loading" | "ok" | "error"

export function MagazineReader({
  magazine,
  onClose,
  initialPage = 1,
}: {
  magazine: Magazine
  onClose: () => void
  initialPage?: number
}) {
  // Índice inicial (0-based) a partir da página do deep-link.
  const startIndex = Math.max(0, (initialPage || 1) - 1)
  // Total conhecido: vem do banco (pages) ou cresce conforme a sondagem.
  const [known, setKnown] = useState<number>(
    Math.max(magazine.pages ?? PRELOAD_AHEAD, startIndex + 1 + PRELOAD_AHEAD),
  )
  // Limite final confirmado (quando descobrimos onde a revista termina).
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(magazine.pages)
  const [index, setIndex] = useState(startIndex)
  const [states, setStates] = useState<Record<number, PageState>>({})
  const [reducedMotion, setReducedMotion] = useState(false)

  // Contagem de falhas consecutivas para a sondagem "tente algumas à frente".
  const failStreak = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const on = () => setReducedMotion(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])

  // Conjunto de páginas que devem existir no DOM (janela ao redor do índice).
  const windowPages = useMemo(() => {
    const out: number[] = []
    const start = Math.max(0, index - 1)
    const end = Math.min(known - 1, index + PRELOAD_AHEAD)
    for (let i = start; i <= end; i++) out.push(i)
    return out
  }, [index, known])

  const setPageState = useCallback((i: number, s: PageState) => {
    setStates((prev) => (prev[i] === s ? prev : { ...prev, [i]: s }))
  }, [])

  // Quando uma imagem carrega: zera o streak de falhas e expande a janela.
  const handleLoad = useCallback(
    (i: number) => {
      setPageState(i, "ok")
      failStreak.current = 0
      setKnown((k) => {
        if (confirmedTotal != null) return k
        // Mantém sempre PRELOAD_AHEAD páginas de folga à frente da maior OK.
        return Math.min(MAX_PROBE, Math.max(k, i + 1 + PRELOAD_AHEAD))
      })
    },
    [confirmedTotal, setPageState],
  )

  // Quando uma imagem falha: pode ser o fim da revista. Tentamos algumas à
  // frente (PROBE_TOLERANCE); se todas falharem, fixamos o total.
  const handleError = useCallback(
    (i: number) => {
      setPageState(i, "error")
      if (confirmedTotal != null) return
      // Só consideramos "fim" se as páginas anteriores já carregaram (i.e.
      // estamos sondando o limite, não um buraco no meio por rede instável).
      const prevOk = i === 0 || states[i - 1] === "ok"
      if (!prevOk) return

      failStreak.current += 1
      if (failStreak.current >= PROBE_TOLERANCE) {
        // As últimas N falharam em sequência: a revista termina na última OK.
        let lastOk = -1
        for (let p = i; p >= 0; p--) {
          if (states[p] === "ok") {
            lastOk = p
            break
          }
        }
        const total = Math.max(1, lastOk + 1)
        setConfirmedTotal(total)
        setKnown(total)
        setIndex((cur) => Math.min(cur, total - 1))
      } else {
        // Ainda dentro da tolerância: tenta a próxima página.
        setKnown((k) => Math.min(MAX_PROBE, Math.max(k, i + 2)))
      }
    },
    [confirmedTotal, states, setPageState],
  )

  const maxIndex = (confirmedTotal ?? known) - 1

  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex((cur) => {
        const next = cur + dir
        if (next < 0) return cur
        if (confirmedTotal != null && next > confirmedTotal - 1) return cur
        return next
      })
    },
    [confirmedTotal],
  )

  // Salto irrestrito: vai para qualquer página digitada, mesmo além do fim
  // confirmado. Nesse caso reabrimos a sondagem para tentar localizá-la.
  const jumpTo = useCallback((page: number) => {
    const target = Math.max(0, Math.min(MAX_PROBE - 1, page - 1))
    failStreak.current = 0
    setConfirmedTotal((ct) => (ct != null && target > ct - 1 ? null : ct))
    setKnown((k) => Math.min(MAX_PROBE, Math.max(k, target + 1 + PRELOAD_AHEAD)))
    setIndex(target)
  }, [])

  // Input editável da página atual. Sincroniza com `index` quando não está em foco.
  const [pageInput, setPageInput] = useState(String(index + 1))
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (!editing) setPageInput(String(index + 1))
  }, [index, editing])

  const commitInput = useCallback(() => {
    setEditing(false)
    const n = Number.parseInt(pageInput, 10)
    if (Number.isFinite(n) && n >= 1) jumpTo(n)
    else setPageInput(String(index + 1))
  }, [pageInput, index, jumpTo])

  // Navegação por teclado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Não navega com setas enquanto o usuário digita no campo de página.
      if (e.target instanceof HTMLInputElement) return
      if (e.key === "ArrowRight") go(1)
      else if (e.key === "ArrowLeft") go(-1)
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, onClose])

  // Trava o scroll do body enquanto o leitor está aberto.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // --- Arraste (touch + mouse) -------------------------------------------
  const drag = useRef<{ startX: number; dx: number; active: boolean }>({
    startX: 0,
    dx: 0,
    active: false,
  })
  const [dragDx, setDragDx] = useState(0)

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startX: e.clientX, dx: 0, active: true }
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    let dx = e.clientX - drag.current.startX
    // Resistência nas bordas.
    if ((index === 0 && dx > 0) || (index >= maxIndex && dx < 0)) dx *= 0.35
    drag.current.dx = dx
    setDragDx(dx)
  }
  const endDrag = () => {
    if (!drag.current.active) return
    const dx = drag.current.dx
    drag.current.active = false
    setDragDx(0)
    if (dx <= -SWIPE_THRESHOLD) go(1)
    else if (dx >= SWIPE_THRESHOLD) go(-1)
  }

  const totalLabel = confirmedTotal ?? `${known}+`

  // --- Compartilhar (callout: página atual ou inicial) --------------------
  const [shareOpen, setShareOpen] = useState(false)
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)

  const doShare = useCallback(
    async (page: number) => {
      setShareOpen(false)
      const result = await shareLink({
        title: magazine.name,
        text: `Dá uma olhada na revista ${magazine.name}`,
        url: magazineShareUrl(magazine.slug, page),
      })
      if (result === "copied") {
        setShareFeedback("Link copiado!")
        setTimeout(() => setShareFeedback(null), 1800)
      }
    },
    [magazine.name, magazine.slug],
  )

  // Fecha o callout ao apertar Esc.
  useEffect(() => {
    if (!shareOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShareOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [shareOpen])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--ink)] text-white" role="dialog" aria-modal="true" aria-label={`Leitor: ${magazine.name}`}>
      {/* Topo */}
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">{magazine.name}</p>
          {magazine.cycle && <p className="truncate text-[11px] text-white/60">{magazine.cycle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShareOpen((v) => !v)}
              aria-label="Compartilhar revista"
              aria-expanded={shareOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            >
              {shareFeedback ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
            </button>

            {shareOpen && (
              <>
                {/* Camada para fechar ao clicar fora. */}
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Fechar opções de compartilhar"
                  onClick={() => setShareOpen(false)}
                />
                <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-white text-[var(--ink)] shadow-xl">
                  <p className="border-b border-[var(--ink)]/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-[var(--ink)]/60">
                    O que compartilhar?
                  </p>
                  <button
                    onClick={() => doShare(index + 1)}
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition hover:bg-[var(--pink)]/10"
                  >
                    <span className="text-sm font-black">Página atual</span>
                    <span className="text-xs text-[var(--ink)]/55">Abre direto na página {index + 1}</span>
                  </button>
                  <button
                    onClick={() => doShare(1)}
                    className="flex w-full flex-col items-start gap-0.5 border-t border-[var(--ink)]/10 px-4 py-3 text-left transition hover:bg-[var(--pink)]/10"
                  >
                    <span className="text-sm font-black">Página inicial</span>
                    <span className="text-xs text-[var(--ink)]/55">Compartilha a revista do começo</span>
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar leitor"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Feedback de link copiado (fallback sem Web Share API). */}
      {shareFeedback && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-black text-[var(--ink)] shadow-lg">
          {shareFeedback}
        </div>
      )}

      {/* Palco das páginas */}
      <div
        className="relative flex-1 touch-pan-y select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="flex h-full w-full will-change-transform"
          style={{
            transform: `translate3d(calc(${-index * 100}% + ${dragDx}px), 0, 0)`,
            transition: drag.current.active ? "none" : reducedMotion ? "none" : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {Array.from({ length: known }, (_, i) => {
            const inWindow = windowPages.includes(i)
            const st = states[i] ?? "idle"
            return (
              <div key={i} className="relative flex h-full w-full shrink-0 items-center justify-center px-2">
                {inWindow ? (
                  <>
                    {st !== "ok" && st !== "error" && (
                      <Loader2 className="absolute h-7 w-7 animate-spin text-white/40" />
                    )}
                    {st === "error" ? (
                      <p className="px-6 text-center text-sm text-white/40">Página indisponível</p>
                    ) : (
                      // <img> nativo: leve, sem otimização do Next (CDN externo),
                      // decode assíncrono e lazy fora da página atual.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pageUrl(magazine.slug, i) || "/placeholder.svg"}
                        alt={`${magazine.name} — página ${i + 1}`}
                        loading={i === index ? "eager" : "lazy"}
                        decoding="async"
                        draggable={false}
                        onLoad={() => handleLoad(i)}
                        onError={() => handleError(i)}
                        className="max-h-full max-w-full object-contain"
                        style={{ opacity: st === "ok" ? 1 : 0, transition: "opacity 200ms ease" }}
                      />
                    )}
                  </>
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Setas (desktop). stopPropagation no pointerdown evita que o palco
            capture o ponteiro e "engula" o clique. */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Página anterior"
          className="absolute left-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/30 disabled:opacity-0 md:flex"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => go(1)}
          disabled={confirmedTotal != null && index >= confirmedTotal - 1}
          aria-label="Próxima página"
          className="absolute right-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/30 disabled:opacity-0 md:flex"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Indicador de página */}
      <footer className="flex items-center justify-center gap-3 px-4 py-3 text-sm">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Página anterior"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/25 disabled:opacity-30 md:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 tabular-nums text-white/80">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pageInput}
            onFocus={(e) => {
              setEditing(true)
              e.currentTarget.select()
            }}
            onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commitInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              else if (e.key === "Escape") {
                setPageInput(String(index + 1))
                setEditing(false)
                e.currentTarget.blur()
              }
            }}
            aria-label="Ir para página"
            className="w-12 rounded-md bg-white/10 px-2 py-1 text-center text-white outline-none transition focus:bg-white/20 focus:ring-2 focus:ring-[var(--accent)]"
          />
          <span className="text-white/40">/ {totalLabel}</span>
        </div>
        <button
          onClick={() => go(1)}
          disabled={confirmedTotal != null && index >= confirmedTotal - 1}
          aria-label="Próxima página"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/25 disabled:opacity-30 md:hidden"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </footer>
    </div>
  )
}
