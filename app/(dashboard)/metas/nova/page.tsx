"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react"

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface StoreRow { id: number; code: string; name: string }

interface ConsultorLine {
  key: number
  consultant_name: string
  consultant_code: string
  cluster: string
  goal_base: string
  goal_projection: string
  goal_lo: string
  goal_solar: string
  goal_rx: string
}

const emptyLine = (key: number): ConsultorLine => ({
  key,
  consultant_name: "",
  consultant_code: "",
  cluster: "3",
  goal_base: "",
  goal_projection: "",
  goal_lo: "",
  goal_solar: "",
  goal_rx: "",
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toNum = (v: string) => parseFloat(v.replace(/[^\d,]/g, "").replace(",", ".")) || 0

const labelInput = "block text-xs font-semibold mb-1"
const styleLabel = { color: "#60708A", textTransform: "uppercase" as const, letterSpacing: "0.05em" }
const styleInput = {
  width: "100%", padding: "8px 12px", borderRadius: 10, border: "1px solid #DDE7F3",
  fontSize: 14, color: "#121212", outline: "none", background: "#fff"
}
const styleInputSm = { ...styleInput, padding: "6px 10px", fontSize: 13 }

// ─── Página ──────────────────────────────────────────────────────────────────

export default function MetasNovaPage() {
  const router = useRouter()

  const [stores, setStores]     = useState<StoreRow[]>([])
  const [storeId, setStoreId]   = useState("")
  const [refMonth, setRefMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [linhas, setLinhas]     = useState<ConsultorLine[]>([emptyLine(Date.now())])
  const [saving, setSaving]     = useState(false)
  const [erro, setErro]         = useState("")

  useEffect(() => {
    supabase.schema("sascarol").from("stores")
      .select("id, code, name").order("code")
      .then(({ data }) => {
        const rows = (data ?? []) as StoreRow[]
        setStores(rows)
        if (rows.length > 0) setStoreId(String(rows[0].id))
      })
  }, [])

  const updateLinha = (key: number, field: keyof ConsultorLine, value: string) => {
    setLinhas(prev => prev.map(l => l.key === key ? { ...l, [field]: value } : l))
  }

  const addLinha = () => setLinhas(prev => [...prev, emptyLine(Date.now())])

  const removeLinha = (key: number) => {
    if (linhas.length === 1) return
    setLinhas(prev => prev.filter(l => l.key !== key))
  }

  const handleSalvar = async () => {
    setErro("")
    if (!storeId) { setErro("Selecione uma loja."); return }
    if (!refMonth) { setErro("Informe o mês de referência."); return }
    const invalidas = linhas.filter(l => !l.consultant_name.trim() || !l.consultant_code.trim())
    if (invalidas.length > 0) { setErro("Preencha nome e código de todos os consultores."); return }

    setSaving(true)
    const refDate = `${refMonth}-01`

    const rows = linhas.map(l => ({
      store_id:        Number(storeId),
      consultant_name: l.consultant_name.trim().toUpperCase(),
      consultant_code: l.consultant_code.trim(),
      ref_month:       refDate,
      cluster:         Number(l.cluster) || null,
      goal_base:       toNum(l.goal_base),
      goal_projection: toNum(l.goal_projection),
      goal_lo:         toNum(l.goal_lo),
      goal_solar:      toNum(l.goal_solar),
      goal_rx:         toNum(l.goal_rx),
    }))

    const { error } = await supabase
      .schema("sascarol")
      .from("seller_goals")
      .upsert(rows, { onConflict: "store_id,consultant_code,ref_month" })

    setSaving(false)
    if (error) {
      setErro(`Erro ao salvar: ${error.message}`)
    } else {
      router.push("/metas")
    }
  }

  return (
    <>
      <Header breadcrumbs={["Home", "Metas", "Nova Meta"]} title="Cadastrar Meta" />

      <main className="pt-[64px] px-8 py-6 space-y-5 max-w-6xl">

        {/* Botão voltar */}
        <motion.button
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => router.push("/metas")}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: "#556376" }}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Metas
        </motion.button>

        {/* Cabeçalho da meta */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "#fff", border: "1px solid #DDE7F3", borderRadius: 16, padding: 24, boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#061A35", marginBottom: 16 }}>
            Configuração do Período
          </h2>
          <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label className={labelInput} style={styleLabel}>Loja</label>
              <select value={storeId} onChange={e => setStoreId(e.target.value)} style={styleInput}>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelInput} style={styleLabel}>Mês de Referência</label>
              <input
                type="month"
                value={refMonth}
                onChange={e => setRefMonth(e.target.value)}
                style={styleInput}
              />
            </div>
          </div>
        </motion.div>

        {/* Tabela de consultores */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: "#fff", border: "1px solid #DDE7F3", borderRadius: 16, boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
        >
          <div className="px-6 py-4" style={{ borderBottom: "1px solid #EAF2FF" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#061A35" }}>Consultores e Metas</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
              Valores em R$. Use vírgula para decimais (ex: 55000,00)
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F6FAFF" }}>
                  {["CONSULTOR", "COD.", "CLUSTER", "META BASE", "META PROJ.", "META L.O", "META SOL", "META RX", ""].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#60708A", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #EAF2FF", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={l.key} style={{ borderBottom: "1px solid #F0F5FF" }}>
                    <td style={{ padding: "8px 12px", minWidth: 220 }}>
                      <input value={l.consultant_name} onChange={e => updateLinha(l.key, "consultant_name", e.target.value)}
                        placeholder="Nome completo" style={styleInputSm} />
                    </td>
                    <td style={{ padding: "8px 12px", minWidth: 90 }}>
                      <input value={l.consultant_code} onChange={e => updateLinha(l.key, "consultant_code", e.target.value)}
                        placeholder="Código" style={styleInputSm} />
                    </td>
                    <td style={{ padding: "8px 12px", minWidth: 80 }}>
                      <select value={l.cluster} onChange={e => updateLinha(l.key, "cluster", e.target.value)} style={styleInputSm}>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </td>
                    <td style={{ padding: "8px 12px", minWidth: 120 }}>
                      <input value={l.goal_base} onChange={e => updateLinha(l.key, "goal_base", e.target.value)}
                        placeholder="0,00" style={styleInputSm} />
                    </td>
                    <td style={{ padding: "8px 12px", minWidth: 120 }}>
                      <input value={l.goal_projection} onChange={e => updateLinha(l.key, "goal_projection", e.target.value)}
                        placeholder="0,00" style={styleInputSm} />
                    </td>
                    <td style={{ padding: "8px 12px", minWidth: 120 }}>
                      <input value={l.goal_lo} onChange={e => updateLinha(l.key, "goal_lo", e.target.value)}
                        placeholder="0,00" style={styleInputSm} />
                    </td>
                    <td style={{ padding: "8px 12px", minWidth: 120 }}>
                      <input value={l.goal_solar} onChange={e => updateLinha(l.key, "goal_solar", e.target.value)}
                        placeholder="0,00" style={styleInputSm} />
                    </td>
                    <td style={{ padding: "8px 12px", minWidth: 120 }}>
                      <input value={l.goal_rx} onChange={e => updateLinha(l.key, "goal_rx", e.target.value)}
                        placeholder="0,00" style={styleInputSm} />
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <button onClick={() => removeLinha(l.key)} disabled={linhas.length === 1}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: linhas.length === 1 ? "#cbd5e1" : "#ef4444", background: linhas.length === 1 ? "transparent" : "#fff5f5" }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3" style={{ borderTop: "1px solid #EAF2FF" }}>
            <button onClick={addLinha}
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: "#0f2744" }}>
              <Plus className="w-4 h-4" /> Adicionar consultor
            </button>
          </div>
        </motion.div>

        {/* Erro */}
        {erro && (
          <div className="px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#ef4444" }}>
            {erro}
          </div>
        )}

        {/* Botões */}
        <div className="flex items-center gap-3 pb-6">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSalvar} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: saving ? "#93c5fd" : "#0f2744" }}
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando…" : "Salvar Metas"}
          </motion.button>
          <button onClick={() => router.push("/metas")}
            className="px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "#f1f5f9", color: "#556376" }}>
            Cancelar
          </button>
        </div>
      </main>
    </>
  )
}
