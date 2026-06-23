"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import {
  ArrowLeft, UserPlus, Loader2, AlertCircle, Check,
} from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface StoreOption      { id: number; code: string; name: string }
interface JobOption        { id: number; name: string }
interface DepartmentOption { id: number; name: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "123.456.789-01" → "12345678901" */
function cleanCpf(v: string) { return v.replace(/\D/g, "") }

/** Formata dígitos → "123.456.789-01" */
function maskCpf(v: string) {
  const d = cleanCpf(v).slice(0, 11)
  if (d.length <= 3)  return d
  if (d.length <= 6)  return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9)  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

/** "(86) 99999-0000" mask */
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2)  return d.length ? `(${d}` : ""
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  return v
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function NovoFuncionarioPage() {
  const router = useRouter()

  // ── Referência
  const [stores,      setStores]      = useState<StoreOption[]>([])
  const [jobs,        setJobs]        = useState<JobOption[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [loadingRef,  setLoadingRef]  = useState(true)

  // ── Formulário
  const [fullName,       setFullName]       = useState("")
  const [shortName,      setShortName]      = useState("")
  const [cpf,            setCpf]            = useState("")
  const [email,          setEmail]          = useState("")
  const [phone1,         setPhone1]         = useState("")
  const [phone2,         setPhone2]         = useState("")
  const [storeId,        setStoreId]        = useState("")
  const [jobId,          setJobId]          = useState("")
  const [departmentId,   setDepartmentId]   = useState("")
  const [status,         setStatus]         = useState("ATIVO")
  const [hiringDate,     setHiringDate]     = useState("")

  // ── Estado
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)

  // ─── Carga de referência ──────────────────────────────────────────────────

  useEffect(() => {
    const sb = createSupabaseBrowserClient()
    Promise.all([
      sb.from("stores").select("id, code, name").eq("active", true).order("code"),
      sb.from("jobs").select("id, name").eq("active", true).order("name"),
      sb.from("departments").select("id, name").eq("active", true).order("name"),
    ]).then(([sRes, jRes, dRes]) => {
      if (sRes.data) setStores(sRes.data as StoreOption[])
      if (jRes.data) setJobs(jRes.data as JobOption[])
      if (dRes.data) setDepartments(dRes.data as DepartmentOption[])
      setLoadingRef(false)
    })
  }, [])

  // ─── Validação ───────────────────────────────────────────────────────────

  function validar() {
    const e: Record<string, string> = {}
    if (!fullName.trim())          e.fullName  = "Nome obrigatório"
    if (fullName.trim().length < 3) e.fullName = "Nome muito curto"
    if (cpf && cleanCpf(cpf).length !== 11)
                                   e.cpf       = "CPF deve ter 11 dígitos"
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                                   e.email     = "E-mail inválido"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!validar()) return
    setSaving(true)

    const sb = createSupabaseBrowserClient()
    const { error } = await sb.from("employees").insert({
      full_name:     fullName.trim(),
      short_name:    shortName.trim() || null,
      cpf:           cpf ? cleanCpf(cpf) : null,
      email:         email.trim() || null,
      phone_1:       phone1 ? phone1.replace(/\D/g, "") : null,
      phone_2:       phone2 ? phone2.replace(/\D/g, "") : null,
      store_id:      storeId      ? parseInt(storeId)      : null,
      job_id:        jobId        ? parseInt(jobId)        : null,
      department_id: departmentId ? parseInt(departmentId) : null,
      status,
      hiring_date:   hiringDate || null,
      active:        true,
    })

    setSaving(false)
    if (error) {
      setErrors({ _global: error.message })
      return
    }
    setSuccess(true)
    setTimeout(() => router.push("/funcionarios"), 1200)
  }

  // ─── Estilos ─────────────────────────────────────────────────────────────

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "#556376",
    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6,
    fontFamily: "sans-serif",
  }

  function inputStyle(err?: string): React.CSSProperties {
    return {
      width: "100%", padding: "10px 14px", borderRadius: 10, outline: "none",
      border: `1.5px solid ${err ? "#fca5a5" : "#e2e8f0"}`,
      fontSize: 14, color: "#121212", background: err ? "#fff5f5" : "#f8fafc",
      fontFamily: "sans-serif",
    }
  }

  const selStyle: React.CSSProperties = {
    width: "100%", padding: "10px 36px 10px 14px", borderRadius: 10, outline: "none",
    border: "1.5px solid #e2e8f0", fontSize: 14, color: "#121212",
    background: "#f8fafc url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 12px center",
    appearance: "none", cursor: "pointer", fontFamily: "sans-serif",
  }

  const STATUS_OPTIONS = [
    { value: "ATIVO",      label: "Ativo",     bg: "#D1FAE5", color: "#065F46" },
    { value: "AFASTADO",   label: "Afastado",  bg: "#FEF3C7", color: "#92400E" },
    { value: "FERIAS",     label: "Férias",    bg: "#DBEAFE", color: "#1E40AF" },
    { value: "DESLIGADO",  label: "Desligado", bg: "#FEE2E2", color: "#991B1B" },
  ]

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <Header breadcrumbs={["Home", "Funcionários", "Novo"]} title="Cadastrar Funcionário" />

      <main className="pt-[64px] px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto space-y-6"
        >

          {/* Voltar */}
          <Link href="/funcionarios"
            className="inline-flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: "#7e8b9c" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#0f2744")}
            onMouseLeave={e => (e.currentTarget.style.color = "#7e8b9c")}
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para Funcionários
          </Link>

          {/* Card principal */}
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "#fff", borderColor: "#e2e8f0", boxShadow: "0 1px 8px rgba(15,39,68,0.06)" }}>

            {/* Header do card */}
            <div className="px-8 py-5 flex items-center gap-3"
              style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#0f2744,#1d4ed8)" }}>
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f2744" }}>
                  Novo Funcionário
                </h2>
                <p style={{ fontSize: 13, color: "#7e8b9c" }}>
                  Preencha os dados para adicionar ao quadro
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-7 space-y-6">

              {/* Erro global */}
              {errors._global && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                  style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
                  <span style={{ fontSize: 13, color: "#dc2626" }}>{errors._global}</span>
                </motion.div>
              )}

              {/* ── Seção: Identificação ─────────────────────────────────── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: "#0f2744", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                  Identificação
                </p>
                <div className="space-y-4">

                  {/* Nome completo */}
                  <div>
                    <label style={labelStyle}>
                      Nome e Sobrenome <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: "" })) }}
                      placeholder="Ex: Maria das Graças Silva"
                      style={inputStyle(errors.fullName)}
                      onFocus={e => !errors.fullName && (e.target.style.borderColor = "#1d4ed8")}
                      onBlur={e  => !errors.fullName && (e.target.style.borderColor = "#e2e8f0")}
                    />
                    {errors.fullName && (
                      <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{errors.fullName}</p>
                    )}
                  </div>

                  {/* Nome curto + CPF lado a lado */}
                  <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                      <label style={labelStyle}>Nome Curto</label>
                      <input
                        type="text"
                        value={shortName}
                        onChange={e => setShortName(e.target.value)}
                        placeholder="Ex: Maria Graças"
                        maxLength={30}
                        style={inputStyle()}
                        onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                        onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                      />
                      <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                        Exibido nas movimentações
                      </p>
                    </div>
                    <div>
                      <label style={labelStyle}>CPF</label>
                      <input
                        type="text"
                        value={cpf}
                        onChange={e => { setCpf(maskCpf(e.target.value)); setErrors(p => ({ ...p, cpf: "" })) }}
                        placeholder="000.000.000-00"
                        style={inputStyle(errors.cpf)}
                        onFocus={e => !errors.cpf && (e.target.style.borderColor = "#1d4ed8")}
                        onBlur={e  => !errors.cpf  && (e.target.style.borderColor = "#e2e8f0")}
                      />
                      {errors.cpf && (
                        <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{errors.cpf}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Seção: Contato ───────────────────────────────────────── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: "#0f2744", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                  Contato
                </p>
                <div className="space-y-4">
                  <div>
                    <label style={labelStyle}>E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })) }}
                      placeholder="funcionario@email.com"
                      style={inputStyle(errors.email)}
                      onFocus={e => !errors.email && (e.target.style.borderColor = "#1d4ed8")}
                      onBlur={e  => !errors.email  && (e.target.style.borderColor = "#e2e8f0")}
                    />
                    {errors.email && (
                      <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{errors.email}</p>
                    )}
                  </div>

                  <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                      <label style={labelStyle}>Telefone Principal</label>
                      <input
                        type="text"
                        value={phone1}
                        onChange={e => setPhone1(maskPhone(e.target.value))}
                        placeholder="(86) 99999-0000"
                        style={inputStyle()}
                        onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                        onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Telefone Alternativo</label>
                      <input
                        type="text"
                        value={phone2}
                        onChange={e => setPhone2(maskPhone(e.target.value))}
                        placeholder="(86) 99999-0000"
                        style={inputStyle()}
                        onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                        onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Seção: Vínculo ───────────────────────────────────────── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: "#0f2744", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                  Vínculo
                </p>
                <div className="space-y-4">

                  {/* Função + Departamento */}
                  <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                      <label style={labelStyle}>Função / Cargo</label>
                      <select value={jobId} onChange={e => setJobId(e.target.value)}
                        style={selStyle} disabled={loadingRef}>
                        <option value="">Selecione…</option>
                        {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Departamento</label>
                      <select value={departmentId} onChange={e => setDepartmentId(e.target.value)}
                        style={selStyle} disabled={loadingRef}>
                        <option value="">Selecione…</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Loja */}
                  <div>
                    <label style={labelStyle}>Loja</label>
                    <select value={storeId} onChange={e => setStoreId(e.target.value)}
                      style={selStyle} disabled={loadingRef}>
                      <option value="">— Sem loja (administrativo) —</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.code} — {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status + Data de admissão */}
                  <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                        {STATUS_OPTIONS.map(opt => (
                          <button key={opt.value} type="button"
                            onClick={() => setStatus(opt.value)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-left transition-all"
                            style={{
                              background:  status === opt.value ? opt.bg : "#f8fafc",
                              borderColor: status === opt.value ? opt.color : "#e2e8f0",
                              fontSize: 13,
                              color:       status === opt.value ? opt.color : "#3c4859",
                              fontWeight:  status === opt.value ? 600 : 400,
                            }}
                          >
                            {status === opt.value && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Data de Admissão</label>
                      <input
                        type="date"
                        value={hiringDate}
                        onChange={e => setHiringDate(e.target.value)}
                        style={{ ...inputStyle(), color: hiringDate ? "#121212" : "#94a3b8" }}
                        onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                        onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Ações ────────────────────────────────────────────────── */}
              <div className="flex items-center justify-end gap-3 pt-2"
                style={{ borderTop: "1px solid #f1f5f9" }}>
                <Link href="/funcionarios"
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ color: "#556376" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  Cancelar
                </Link>

                <motion.button
                  type="submit"
                  disabled={saving || success}
                  whileHover={!saving ? { scale: 1.02, boxShadow: "0 4px 16px rgba(15,39,68,0.25)" } : {}}
                  whileTap={!saving ? { scale: 0.98 } : {}}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: success ? "#16a34a" : "#0f2744",
                    minWidth: 160,
                    justifyContent: "center",
                  }}
                >
                  {success ? (
                    <><Check className="w-4 h-4" /> Cadastrado!</>
                  ) : saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Cadastrar Funcionário</>
                  )}
                </motion.button>
              </div>

            </form>
          </div>
        </motion.div>
      </main>
    </>
  )
}
