"use client"

import { use, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import {
  ArrowLeft, Pencil, User, Phone, Mail, MapPin,
  Briefcase, Building2, Calendar, CreditCard, Loader2,
} from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtDate, fmtCpf, fmtPhone } from "@/lib/types"
import { initials } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface EmployeeDetail {
  id:               number
  full_name:        string
  short_name:       string | null
  cpf:              string | null
  email:            string | null
  phone_1:          string | null
  phone_2:          string | null
  status:           string
  hiring_date:      string | null
  termination_date: string | null
  active:           boolean
  created_at:       string
  store:      { id: number; code: string; name: string } | null
  job:        { id: number; name: string } | null
  department: { id: number; name: string } | null
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#3B82F6,#0F5BFF)",
  "linear-gradient(135deg,#8B5CF6,#6D28D9)",
  "linear-gradient(135deg,#10B981,#059669)",
  "linear-gradient(135deg,#F59E0B,#D97706)",
  "linear-gradient(135deg,#EF4444,#DC2626)",
  "linear-gradient(135deg,#0891B2,#0E7490)",
]

function fmtStatus(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
      <span className="flex-shrink-0 mt-0.5" style={{ color: "#94a3b8" }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </p>
        <p style={{ fontSize: 14, color: "#3c4859", marginTop: 2 }}>{value}</p>
      </div>
    </div>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function FuncionarioPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createSupabaseBrowserClient()
      const { data, error } = await sb
        .from("employees")
        .select(`
          id, full_name, short_name, cpf, email, phone_1, phone_2,
          status, hiring_date, termination_date, active, created_at,
          store:stores!store_id(id,code,name),
          job:jobs!job_id(id,name),
          department:departments!department_id(id,name)
        `)
        .eq("id", parseInt(id))
        .is("deleted_at", null)
        .single()

      if (error || !data) { setNotFound(true); setLoading(false); return }
      setEmployee(data as EmployeeDetail)
      setLoading(false)
    }
    load()
  }, [id])

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) return (
    <>
      <Header breadcrumbs={["Home", "Funcionários", "Perfil"]} title="Funcionário" />
      <main className="pt-[64px] px-8 py-6 flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#94a3b8" }} />
      </main>
    </>
  )

  if (notFound) return (
    <>
      <Header breadcrumbs={["Home", "Funcionários"]} title="Não encontrado" />
      <main className="pt-[64px] px-8 py-10 text-center" style={{ color: "#7e8b9c" }}>
        <p className="text-lg font-semibold mb-2">Funcionário não encontrado</p>
        <Link href="/funcionarios" className="text-sm underline">← Voltar para a lista</Link>
      </main>
    </>
  )

  const f = employee!
  const avatarColor = AVATAR_COLORS[f.id % AVATAR_COLORS.length]

  return (
    <>
      <Header
        breadcrumbs={["Home", "Funcionários", f.full_name]}
        title={f.full_name}
      />

      <main className="pt-[64px] px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto space-y-5"
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

          {/* Card de identidade */}
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "#fff", borderColor: "#e2e8f0", boxShadow: "0 1px 8px rgba(15,39,68,0.06)" }}>

            {/* Header com avatar */}
            <div className="px-8 py-6 flex items-center gap-5"
              style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                style={{ background: avatarColor }}>
                {initials(f.short_name ?? f.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f2744" }}>{f.full_name}</h2>
                {f.short_name && (
                  <p style={{ fontSize: 13, color: "#7e8b9c" }}>Conhecido como: {f.short_name}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusBadge status={fmtStatus(f.status)} size="sm" />
                  {f.store && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: "#dbeafe", color: "#1e40af" }}>
                      Loja {f.store.code}
                    </span>
                  )}
                  {!f.active && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: "#fef2f2", color: "#dc2626" }}>
                      Inativo
                    </span>
                  )}
                </div>
              </div>
              <Link href={`/funcionarios/${f.id}/editar`}>
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{ background: "#0f2744" }}
                >
                  <Pencil className="w-4 h-4" /> Editar
                </motion.span>
              </Link>
            </div>

            {/* Dados */}
            <div className="px-8 py-2">

              {/* Contato */}
              <p className="text-xs font-bold uppercase tracking-widest pt-4 pb-1"
                style={{ color: "#0f2744" }}>Contato</p>

              {f.cpf && (
                <InfoRow icon={<CreditCard className="w-4 h-4" />} label="CPF" value={fmtCpf(f.cpf)} />
              )}
              <InfoRow
                icon={<Mail className="w-4 h-4" />}
                label="E-mail"
                value={f.email
                  ? <a href={`mailto:${f.email}`} className="hover:underline" style={{ color: "#1d4ed8" }}>{f.email}</a>
                  : <span style={{ color: "#cbd5e1" }}>—</span>
                }
              />
              <InfoRow
                icon={<Phone className="w-4 h-4" />}
                label="Telefone"
                value={f.phone_1 ? fmtPhone(f.phone_1) : <span style={{ color: "#cbd5e1" }}>—</span>}
              />
              {f.phone_2 && (
                <InfoRow icon={<Phone className="w-4 h-4" />} label="Alternativo" value={fmtPhone(f.phone_2)} />
              )}

              {/* Vínculo */}
              <p className="text-xs font-bold uppercase tracking-widest pt-5 pb-1"
                style={{ color: "#0f2744" }}>Vínculo</p>

              <InfoRow
                icon={<Briefcase className="w-4 h-4" />}
                label="Função / Cargo"
                value={f.job?.name ?? <span style={{ color: "#cbd5e1" }}>—</span>}
              />
              <InfoRow
                icon={<Building2 className="w-4 h-4" />}
                label="Departamento"
                value={f.department?.name ?? <span style={{ color: "#cbd5e1" }}>—</span>}
              />
              <InfoRow
                icon={<MapPin className="w-4 h-4" />}
                label="Loja"
                value={f.store ? `${f.store.code} — ${f.store.name}` : <span style={{ color: "#cbd5e1" }}>—</span>}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Data de Admissão"
                value={fmtDate(f.hiring_date)}
              />
              {f.termination_date && (
                <InfoRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Data de Desligamento"
                  value={fmtDate(f.termination_date)}
                />
              )}
              <InfoRow
                icon={<User className="w-4 h-4" />}
                label="Cadastrado em"
                value={fmtDate(f.created_at)}
              />

              <div className="pb-4" />
            </div>
          </div>

        </motion.div>
      </main>
    </>
  )
}
