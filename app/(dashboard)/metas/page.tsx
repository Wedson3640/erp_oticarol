"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { fmt } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Plus, Target, ChevronLeft, ChevronRight, Store } from "lucide-react"
import { useRouter } from "next/navigation"

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface StoreRow {
  id: number
  code: string
  name: string
  franchise: string | null
  manager_name: string | null
}

interface GoalRow {
  id: number
  consultant_name: string
  consultant_code: string
  cluster: number | null
  goal_base: number
  goal_projection: number
  goal_lo: number
  goal_solar: number
  goal_rx: number
  actual_total: number
  actual_lo: number
  actual_solar: number
  actual_rx: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pct = (real: number, meta: number) =>
  meta > 0 ? Math.round((real / meta) * 100) : 0

const pctColor = (p: number) =>
  p >= 100 ? "#16A34A" : p >= 60 ? "#F59E0B" : "#EF4444"

const rowBg = (p: number) =>
  p >= 100 ? "#f0fdf4" : p >= 60 ? "#fffbeb" : "#fff5f5"

const fmtMes = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

const addMes = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1)

const mesISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`

const clusterLabel = (c: number | null) =>
  c === 1 ? "Cluster 1" : c === 2 ? "Cluster 2" : c === 3 ? "Cluster 3" : "—"

const franchiseBadge = (f: string | null) => {
  if (f === "grandvision") return { label: "GrandVision", bg: "#dbeafe", color: "#1d4ed8" }
  if (f === "sunglass")    return { label: "Sunglass Hut", bg: "#fce7f3", color: "#be185d" }
  return { label: "Óticas Carol", bg: "#dcfce7", color: "#15803d" }
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function MetasPage() {
  const router = useRouter()

  const [mesRef, setMesRef]     = useState<Date>(new Date(2023, 7, 1)) // ago/2023 (dados do ETL)
  const [stores, setStores]     = useState<StoreRow[]>([])
  const [storeId, setStoreId]   = useState<number | null>(null)
  const [goals, setGoals]       = useState<GoalRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [store, setStore]       = useState<StoreRow | null>(null)

  // ── Carrega lojas (uma vez) ──────────────────────────────────────────────
  useEffect(() => {
    supabase
      .schema("sascarol")
      .from("stores")
      .select("id, code, name, franchise, manager_name")
      .order("code")
      .then(({ data }) => {
        const rows = (data ?? []) as StoreRow[]
        setStores(rows)
        if (rows.length > 0 && storeId === null) {
          setStoreId(rows[0].id)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Atualiza store selecionada ──────────────────────────────────────────
  useEffect(() => {
    setStore(stores.find(s => s.id === storeId) ?? null)
  }, [storeId, stores])

  // ── Carrega metas do mês/loja ───────────────────────────────────────────
  const loadGoals = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    const { data } = await supabase
      .schema("sascarol")
      .from("seller_goals")
      .select("id,consultant_name,consultant_code,cluster,goal_base,goal_projection,goal_lo,goal_solar,goal_rx,actual_total,actual_lo,actual_solar,actual_rx")
      .eq("store_id", storeId)
      .eq("ref_month", mesISO(mesRef))
      .order("consultant_name")
    setGoals((data ?? []) as GoalRow[])
    setLoading(false)
  }, [storeId, mesRef])

  useEffect(() => { loadGoals() }, [loadGoals])

  // ── Totais ──────────────────────────────────────────────────────────────
  const totals = goals.reduce(
    (acc, g) => ({
      goal_base:      acc.goal_base      + g.goal_base,
      goal_projection:acc.goal_projection+ g.goal_projection,
      goal_lo:        acc.goal_lo        + g.goal_lo,
      goal_solar:     acc.goal_solar     + g.goal_solar,
      goal_rx:        acc.goal_rx        + g.goal_rx,
      actual_total:   acc.actual_total   + g.actual_total,
      actual_lo:      acc.actual_lo      + g.actual_lo,
      actual_solar:   acc.actual_solar   + g.actual_solar,
      actual_rx:      acc.actual_rx      + g.actual_rx,
    }),
    { goal_base:0, goal_projection:0, goal_lo:0, goal_solar:0, goal_rx:0,
      actual_total:0, actual_lo:0, actual_solar:0, actual_rx:0 }
  )

  const badge = franchiseBadge(store?.franchise ?? null)

  return (
    <>
      <Header breadcrumbs={["Home", "Metas"]} title="Metas por Vendedor" />

      <main className="pt-[64px] px-8 py-6 space-y-5">

        {/* ── Barra superior ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-3 flex-wrap">
            {/* Seletor de loja */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
              <Store className="w-4 h-4" style={{ color: "#556376" }} />
              <select
                value={storeId ?? ""}
                onChange={e => setStoreId(Number(e.target.value))}
                className="text-sm font-medium outline-none bg-transparent"
                style={{ color: "#121212", minWidth: 180 }}
              >
                {stores.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Badge franquia */}
            {store && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
            )}

            {/* Gerente */}
            {store?.manager_name && (
              <span className="text-sm" style={{ color: "#556376" }}>
                Gerente: <strong style={{ color: "#2F4162" }}>{store.manager_name}</strong>
              </span>
            )}

            {/* Navegação mês */}
            <div className="flex items-center gap-2 ml-2">
              <button onClick={() => setMesRef(m => addMes(m, -1))}
                className="p-2 rounded-xl" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                <ChevronLeft className="w-4 h-4" style={{ color: "#556376" }} />
              </button>
              <div className="px-4 py-2 rounded-xl font-semibold text-sm capitalize"
                style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#121212", minWidth: 160, textAlign: "center" }}>
                {fmtMes(mesRef)}
              </div>
              <button onClick={() => setMesRef(m => addMes(m, 1))}
                className="p-2 rounded-xl" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                <ChevronRight className="w-4 h-4" style={{ color: "#556376" }} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/metas/nova")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#0f2744" }}
            >
              <Plus className="w-4 h-4" /> Cadastrar Meta
            </motion.button>
          </div>
        </motion.div>

        {/* ── KPI Cards ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {[
            { label: "Meta Base",   meta: totals.goal_base,      real: totals.actual_total,  icon: "💰" },
            { label: "Meta L.O",    meta: totals.goal_lo,        real: totals.actual_lo,     icon: "👓" },
            { label: "Meta Solar",  meta: totals.goal_solar,     real: totals.actual_solar,  icon: "🕶️" },
            { label: "Meta RX",     meta: totals.goal_rx,        real: totals.actual_rx,     icon: "💊" },
          ].map((card, i) => {
            const p = pct(card.real, card.meta)
            return (
              <motion.div key={card.label}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{ background: "#fff", border: "1px solid #DDE7F3", borderRadius: 16, padding: 22, boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}>
                <div className="flex items-start justify-between mb-3">
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#2F4162" }}>{card.label}</p>
                  <span style={{ fontSize: 18 }}>{card.icon}</span>
                </div>
                {loading ? (
                  <div className="h-8 rounded animate-pulse" style={{ background: "#e8eef7" }} />
                ) : card.meta === 0 ? (
                  <p style={{ fontSize: 13, color: "#94a3b8" }}>Sem dados</p>
                ) : (
                  <>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#061A35" }}>{fmt(card.real)}</p>
                    <p style={{ fontSize: 12, color: "#60708A" }}>
                      Meta: {fmt(card.meta)} · <strong style={{ color: pctColor(p) }}>{p}%</strong>
                    </p>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#E8EEF7" }}>
                      <div style={{ width: `${Math.min(p, 100)}%`, height: "100%", background: pctColor(p), borderRadius: 999 }} />
                    </div>
                  </>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* ── Tabela ── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ background: "#fff", border: "1px solid #DDE7F3", borderRadius: 16, boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}>

          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #EAF2FF" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#061A35" }}>
              Metas por Consultor
            </h2>
            {goals.length > 0 && (
              <span className="text-sm" style={{ color: "#60708A" }}>
                {goals.length} consultor{goals.length !== 1 ? "es" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center" style={{ color: "#94a3b8" }}>Carregando…</div>
          ) : goals.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="w-10 h-10 mx-auto mb-3" style={{ color: "#cbd5e1" }} />
              <p style={{ color: "#94a3b8", fontSize: 14 }}>Sem metas cadastradas para este período</p>
              <button onClick={() => router.push("/metas/nova")}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#0f2744" }}>
                Cadastrar Meta
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#F6FAFF" }}>
                    {["CONSULTOR", "CLUSTER", "META BASE", "META PROJ.", "META L.O", "REAL L.O", "% L.O", "META SOL", "REAL SOL", "% SOL", "META RX", "REAL RX", "% RX"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#60708A", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #EAF2FF", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {goals.map((g, i) => {
                    const pLo  = pct(g.actual_lo,    g.goal_lo)
                    const pSol = pct(g.actual_solar, g.goal_solar)
                    const pRx  = pct(g.actual_rx,    g.goal_rx)
                    const pTot = pct(g.actual_total, g.goal_base)
                    return (
                      <tr key={g.id}
                        style={{ background: rowBg(pTot), borderBottom: i < goals.length - 1 ? "1px solid #F0F5FF" : "none" }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: "#061A35", whiteSpace: "nowrap" }}>
                          {g.consultant_name}
                          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>COD {g.consultant_code}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {g.cluster && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: "#e0e7ff", color: "#3730a3" }}>
                              {clusterLabel(g.cluster)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", color: "#40516F" }}>{fmt(g.goal_base)}</td>
                        <td style={{ padding: "12px 14px", color: "#40516F" }}>{fmt(g.goal_projection)}</td>
                        {/* L.O */}
                        <td style={{ padding: "12px 14px", color: "#40516F" }}>{fmt(g.goal_lo)}</td>
                        <td style={{ padding: "12px 14px", color: "#40516F" }}>{fmt(g.actual_lo)}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: pctColor(pLo) }}>{pLo}%</span>
                        </td>
                        {/* Solar */}
                        <td style={{ padding: "12px 14px", color: "#40516F" }}>{fmt(g.goal_solar)}</td>
                        <td style={{ padding: "12px 14px", color: "#40516F" }}>{fmt(g.actual_solar)}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: pctColor(pSol) }}>{pSol}%</span>
                        </td>
                        {/* RX */}
                        <td style={{ padding: "12px 14px", color: "#40516F" }}>{fmt(g.goal_rx)}</td>
                        <td style={{ padding: "12px 14px", color: "#40516F" }}>{fmt(g.actual_rx)}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: pctColor(pRx) }}>{pRx}%</span>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Linha de totais */}
                  <tr style={{ background: "#0f2744" }}>
                    <td colSpan={2} style={{ padding: "12px 14px", fontWeight: 700, color: "#fff", fontSize: 14 }}>TOTAL</td>
                    <td style={{ padding: "12px 14px", color: "#93c5fd", fontSize: 13 }}>{fmt(totals.goal_base)}</td>
                    <td style={{ padding: "12px 14px", color: "#93c5fd", fontSize: 13 }}>{fmt(totals.goal_projection)}</td>
                    <td style={{ padding: "12px 14px", color: "#93c5fd", fontSize: 13 }}>{fmt(totals.goal_lo)}</td>
                    <td style={{ padding: "12px 14px", color: "#fff", fontWeight: 700, fontSize: 13 }}>{fmt(totals.actual_lo)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: pctColor(pct(totals.actual_lo, totals.goal_lo)) }}>
                        {pct(totals.actual_lo, totals.goal_lo)}%
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#93c5fd", fontSize: 13 }}>{fmt(totals.goal_solar)}</td>
                    <td style={{ padding: "12px 14px", color: "#fff", fontWeight: 700, fontSize: 13 }}>{fmt(totals.actual_solar)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: pctColor(pct(totals.actual_solar, totals.goal_solar)) }}>
                        {pct(totals.actual_solar, totals.goal_solar)}%
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#93c5fd", fontSize: 13 }}>{fmt(totals.goal_rx)}</td>
                    <td style={{ padding: "12px 14px", color: "#fff", fontWeight: 700, fontSize: 13 }}>{fmt(totals.actual_rx)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: pctColor(pct(totals.actual_rx, totals.goal_rx)) }}>
                        {pct(totals.actual_rx, totals.goal_rx)}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>
    </>
  )
}
