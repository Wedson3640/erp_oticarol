"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { ArrowLeft, Loader2, MapPin, MessageCircle, AlertTriangle, Check } from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

// ─── CEP → ViaCEP ─────────────────────────────────────────────────────────────

async function buscaCep(cep: string) {
  const c = cep.replace(/\D/g, "")
  if (c.length !== 8) return null
  try {
    const r = await fetch(`https://viacep.com.br/ws/${c}/json/`)
    const d = await r.json()
    return d.erro ? null : d
  } catch { return null }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function NovoClientePage() {

  const router       = useRouter()
  const searchParams = useSearchParams()
  const retornar     = searchParams.get("retornar") ?? ""  // ex: "pedidos/novo"

  // Formulário
  const [nome,           setNome]           = useState("")
  const [cpf,            setCpf]            = useState("")
  const [telefone,       setTelefone]       = useState("")
  const [isWhatsapp,     setIsWhatsapp]     = useState(false)
  const [email,          setEmail]          = useState("")

  // Endereço
  const [cepVal,         setCepVal]         = useState("")
  const [logradouro,     setLogradouro]     = useState("")
  const [numero,         setNumero]         = useState("")
  const [complemento,    setComplemento]    = useState("")
  const [bairro,         setBairro]         = useState("")
  const [cidade,         setCidade]         = useState("")
  const [uf,             setUf]             = useState("")
  const [referencia,     setReferencia]     = useState("")
  const [cepLoading,     setCepLoading]     = useState(false)
  const [cepError,       setCepError]       = useState<string | null>(null)
  const cepRef = useRef<string>("")

  // Submissão
  const [saving,     setSaving]     = useState(false)
  const [savingStep, setSavingStep] = useState("")
  const [error,      setError]      = useState<string | null>(null)
  const [done,       setDone]       = useState(false)
  const [newId,      setNewId]      = useState<number | null>(null)

  // Pre-preenche cidade/UF com Teresina/PI por default
  useEffect(() => {
    setCidade("Teresina")
    setUf("PI")
  }, [])

  // ─── CEP auto-fill ──────────────────────────────────────────────────────────

  async function lookupCep(digits: string) {
    setCepLoading(true)
    setCepError(null)
    const d = await buscaCep(digits)
    setCepLoading(false)
    if (!d) { setCepError("CEP não encontrado"); return }
    setLogradouro(d.logradouro ?? "")
    setBairro(d.bairro         ?? "")
    setCidade(d.localidade     ?? "")
    setUf(d.uf                 ?? "")
  }

  function handleCepChange(raw: string) {
    const digits    = raw.replace(/\D/g, "").slice(0, 8)
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    setCepVal(formatted)
    cepRef.current = digits
    setCepError(null)
    if (digits.length === 8) lookupCep(digits)
  }

  // ─── Formata CPF enquanto digita ────────────────────────────────────────────

  function handleCpfChange(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 11)
    let f = d
    if (d.length > 9)       f = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
    else if (d.length > 6)  f = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
    else if (d.length > 3)  f = `${d.slice(0,3)}.${d.slice(3)}`
    setCpf(f)
  }

  // ─── Submissão ──────────────────────────────────────────────────────────────

  async function handleSave() {
    // ── Validação obrigatória ────────────────────────────────────────────────
    if (!nome.trim()) {
      setError("Nome completo é obrigatório.")
      return
    }
    const cpfDigits = cpf.replace(/\D/g, "")
    if (cpfDigits.length !== 11) {
      setError("CPF é obrigatório e deve ter 11 dígitos.")
      return
    }
    const telDigits = telefone.replace(/\D/g, "")
    if (telDigits.length < 10) {
      setError("Telefone é obrigatório (mínimo 10 dígitos com DDD).")
      return
    }
    if (!email.trim()) {
      setError("E-mail é obrigatório.")
      return
    }
    if (logradouro.trim() && !numero.trim()) {
      setError("Número da casa é obrigatório quando o logradouro é informado.")
      return
    }

    setSaving(true)
    setError(null)
    const sb = createSupabaseBrowserClient()

    // Verifica duplicata por CPF
    setSavingStep("Verificando CPF...")
    const { data: dup } = await sb
      .from("customers").select("id, name")
      .eq("cpf", cpfDigits).maybeSingle()
    if (dup) {
      setError(`CPF já cadastrado para "${dup.name}". Use a busca para selecionar o cliente.`)
      setSaving(false)
      return
    }

    // Insere cliente
    setSavingStep("Cadastrando cliente...")
    const { data: newCust, error: custErr } = await sb
      .from("customers")
      .insert({
        name:   nome.trim(),
        cpf:    cpfDigits,
        phone:  telDigits,
        email:  email.trim(),
        source: "manual",
      })
      .select("id").single()

    if (custErr || !newCust) {
      setError("Erro ao cadastrar: " + (custErr?.message ?? "falha desconhecida"))
      setSaving(false)
      return
    }

    // Insere endereço se CEP ou logradouro preenchido
    if (cepRef.current || logradouro.trim()) {
      setSavingStep("Salvando endereço...")
      await sb.from("customer_addresses").insert({
        customer_id:     newCust.id,
        zip_code:        cepRef.current || null,
        street:          logradouro.trim() || null,
        number:          numero.trim()     || null,
        complement:      complemento.trim()|| null,
        district:        bairro.trim()     || null,
        city:            cidade.trim()     || null,
        state:           uf.trim().toUpperCase() || null,
        reference_point: referencia.trim() || null,
        is_primary:      true,
      })
    }

    setNewId(newCust.id)
    setDone(true)
    setSaving(false)

    // Redireciona de volta (com o ID do cliente criado) após 1.2s
    setTimeout(() => {
      if (retornar) {
        router.push(`/${retornar}?cliente=${newCust.id}`)
      } else {
        router.push(`/clientes/${newCust.id}`)
      }
    }, 1200)
  }

  // ─── Helpers de UI ──────────────────────────────────────────────────────────

  const s0  = { borderColor: "#e2e8f0", color: "#121212", background: "#f8fafc" }
  const cls = "w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors"

  const lbl = (txt: string, req = false) => (
    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
      style={{ color: "#556376" }}>
      {txt}{req && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
  )

  const inp = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={cls} style={s0}
      onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
      onBlur={e  => (e.target.style.borderColor = "#e2e8f0")} />
  )

  const retornarLabel = retornar === "pedidos/novo"       ? "Voltar para Novo Pedido"
    : retornar === "solicitacoes/nova" ? "Voltar para Nova Solicitação"
    : retornar === "garantias/nova"   ? "Voltar para Nova Garantia"
    : "Voltar"

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(15,39,68,0.45)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 px-10 py-8 rounded-2xl"
              style={{ background: "#fff", boxShadow: "0 20px 60px rgba(15,39,68,0.25)" }}
            >
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#0f2744" }} />
              <p className="text-sm font-semibold" style={{ color: "#121212" }}>
                {savingStep || "Processando..."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Header breadcrumbs={["Home", "Clientes", "Novo Cliente"]} title="Novo Cliente" />

      <main className="pt-[64px] px-8 py-6 space-y-5 max-w-2xl mx-auto">

        <Link href={retornar ? `/${retornar}` : "/pedidos"}
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "#556376" }}>
          <ArrowLeft className="w-4 h-4" /> {retornarLabel}
        </Link>

        {/* Sucesso */}
        {done && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-5 py-4 rounded-xl"
            style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <Check className="w-5 h-5" style={{ color: "#16a34a" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#16a34a" }}>
                Cliente cadastrado com sucesso!
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#4ade80" }}>
                {retornar ? "Redirecionando de volta ao formulário..." : `ID #${newId}`}
              </p>
            </div>
          </motion.div>
        )}

        {/* Formulário */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "#fff", borderRadius: 16, padding: 28,
            border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}>

          <h2 className="font-bold mb-6" style={{ fontSize: 16, color: "#121212" }}>
            Dados do Cliente
          </h2>

          <div className="space-y-4">

            {/* Nome */}
            <div>
              {lbl("Nome Completo", true)}
              {inp({ value: nome, onChange: e => setNome(e.target.value), placeholder: "Nome completo" })}
            </div>

            {/* CPF + Telefone */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                {lbl("CPF", true)}
                {inp({
                  value: cpf,
                  onChange: e => handleCpfChange(e.target.value),
                  placeholder: "000.000.000-00",
                  inputMode: "numeric",
                  required: true,
                  style: {
                    borderColor: cpf && cpf.replace(/\D/g, "").length === 11 ? "#16a34a"
                      : cpf.length > 0 ? "#f59e0b" : "#e2e8f0",
                    color: "#121212",
                    background: "#f8fafc",
                  },
                })}
                {cpf.length > 0 && cpf.replace(/\D/g, "").length < 11 && (
                  <p className="mt-1 text-xs" style={{ color: "#f59e0b" }}>
                    {cpf.replace(/\D/g, "").length}/11 dígitos
                  </p>
                )}
              </div>
              <div>
                {lbl("Telefone", true)}
                {inp({
                  value: telefone,
                  onChange: e => setTelefone(e.target.value),
                  placeholder: "(86) 99999-9999",
                  inputMode: "tel",
                  required: true,
                })}
                {telefone.replace(/\D/g, "").length > 0 && (
                  <button type="button"
                    onClick={() => setIsWhatsapp(!isWhatsapp)}
                    className="mt-1.5 flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: isWhatsapp ? "#16a34a" : "#7e8b9c" }}>
                    <MessageCircle className="w-3.5 h-3.5" />
                    {isWhatsapp ? "WhatsApp ✓" : "É WhatsApp?"}
                  </button>
                )}
              </div>
            </div>

            {/* E-mail */}
            <div>
              {lbl("E-mail", true)}
              {inp({
                type: "email",
                value: email,
                onChange: e => setEmail(e.target.value),
                placeholder: "cliente@email.com",
                required: true,
              })}
            </div>

            {/* Separador endereço */}
            <div className="flex items-center gap-2 pt-2">
              <MapPin className="w-4 h-4" style={{ color: "#556376" }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#556376" }}>
                Endereço
              </span>
              <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
              <span className="text-xs" style={{ color: "#7e8b9c" }}>opcional</span>
            </div>

            {/* CEP */}
            <div>
              {lbl("CEP")}
              <div className="relative">
                {inp({
                  value: cepVal,
                  onChange: e => handleCepChange(e.target.value),
                  placeholder: "64000-000",
                  maxLength: 9,
                  inputMode: "numeric",
                })}
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                    style={{ color: "#7e8b9c" }} />
                )}
              </div>
              {cepError && (
                <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{cepError}</p>
              )}
            </div>

            {/* Logradouro + Número */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 100px" }}>
              <div>
                {lbl("Logradouro")}
                {inp({ value: logradouro, onChange: e => setLogradouro(e.target.value), placeholder: "Rua, Av., Travessa..." })}
              </div>
              <div>
                {lbl("Nº da Casa", !!(logradouro.trim()))}
                {inp({
                  value: numero,
                  onChange: e => setNumero(e.target.value),
                  placeholder: "123",
                  required: !!(logradouro.trim()),
                  style: {
                    borderColor: logradouro.trim() && !numero.trim() ? "#f59e0b" : "#e2e8f0",
                    color: "#121212",
                    background: "#f8fafc",
                  },
                })}
              </div>
            </div>

            {/* Complemento + Bairro */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                {lbl("Complemento")}
                {inp({ value: complemento, onChange: e => setComplemento(e.target.value), placeholder: "Apto, Bloco..." })}
              </div>
              <div>
                {lbl("Bairro")}
                {inp({ value: bairro, onChange: e => setBairro(e.target.value), placeholder: "Bairro" })}
              </div>
            </div>

            {/* Cidade + UF */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 80px" }}>
              <div>
                {lbl("Cidade")}
                {inp({ value: cidade, onChange: e => setCidade(e.target.value), placeholder: "Teresina" })}
              </div>
              <div>
                {lbl("UF")}
                {inp({ value: uf, onChange: e => setUf(e.target.value), placeholder: "PI", maxLength: 2 })}
              </div>
            </div>

            {/* Referência */}
            <div>
              {lbl("Ponto de Referência")}
              {inp({ value: referencia, onChange: e => setReferencia(e.target.value), placeholder: "Próximo ao..." })}
            </div>

          </div>

          {/* Erro */}
          {error && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between mt-6 pt-5"
            style={{ borderTop: "1px solid #f1f5f9" }}>
            <Link href={retornar ? `/${retornar}` : "/pedidos"}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border"
              style={{ borderColor: "#e2e8f0", color: "#3c4859" }}>
              Cancelar
            </Link>
            <motion.button
              whileHover={{ scale: saving ? 1 : 1.02, boxShadow: saving ? "none" : "0 4px 16px rgba(15,39,68,0.25)" }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
              onClick={handleSave}
              disabled={saving || done}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#0f2744", opacity: (saving || done) ? 0.7 : 1, cursor: (saving || done) ? "not-allowed" : "pointer" }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {done ? "✓ Cadastrado!" : saving ? "Salvando..." : "Cadastrar Cliente"}
            </motion.button>
          </div>

        </motion.div>
      </main>
    </>
  )
}
