"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ArrowLeft, ChevronDown, MessageCircle, UserCheck } from "lucide-react"
import Link from "next/link"

const conversa = {
  id: 1,
  cliente: "Maria Aparecida Sousa",
  tel: "(86) 9 9111-2222",
  canal: "WhatsApp",
  interesse: "RX",
  situacao: "Em Atendimento",
  consultor: "Ana Souza",
  loja: "488 — Teresina Shopping",
  inicio: "31/05/2026 10:00",
  demanda: "Cliente interessada em óculos de grau RX. Tem prescrição médica nova e quer avaliar as opções de lentes progressivas. Orçamento em torno de R$ 600,00.",
  historico: [
    { id: 1, data: "31/05/2026 10:00", situacao: "Em Atendimento", operador: "Ana Souza",  obs: "Atendimento iniciado via WhatsApp. Cliente enviou foto da receita." },
  ],
  situacoesDisponiveis: [
    { id: 2, label: "Aguardando Retorno", showDiv: "none"       },
    { id: 3, label: "Convertido",         showDiv: "conversao"  },
    { id: 4, label: "Não Convertido",     showDiv: "motivo"     },
  ],
}

export default function ConversaDetailPage() {
  const [registrando, setRegistrando] = useState(false)
  const [novaSituacao, setNovaSituacao] = useState("")

  const showDiv = conversa.situacoesDisponiveis.find((s) => s.label === novaSituacao)?.showDiv

  return (
    <>
      <Header breadcrumbs={["Home", "Conversas / CRM", conversa.cliente]} title={conversa.cliente} />

      <main className="pt-[64px] px-8 py-6 space-y-5">
        <Link href="/conversas" className="inline-flex items-center gap-2 text-sm" style={{ color: "#64748b" }}>
          <ArrowLeft className="w-4 h-4" /> Voltar para conversas
        </Link>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 280px" }}>

          {/* Principal */}
          <div className="space-y-5">

            {/* Cabeçalho */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}
            >
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <StatusBadge status={conversa.situacao} />
                <span style={{
                  display: "inline-flex", alignItems: "center", padding: "3px 10px",
                  borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#DCFCE7", color: "#14532D",
                }}>
                  <MessageCircle className="inline w-3 h-3 mr-1" /> {conversa.canal}
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center", padding: "3px 10px",
                  borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#EEF2FF", color: "#3730A3",
                }}>
                  {conversa.interesse}
                </span>
              </div>

              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                {[
                  { label: "Telefone",   value: conversa.tel       },
                  { label: "Consultor",  value: conversa.consultor },
                  { label: "Loja",       value: conversa.loja      },
                  { label: "Iniciado em",value: conversa.inicio    },
                  { label: "Canal",      value: conversa.canal     },
                  { label: "Interesse",  value: conversa.interesse },
                ].map((item) => (
                  <div key={item.label}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Demanda */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-4 h-4" style={{ color: "#1d4ed8" }} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Demanda do Cliente</h3>
              </div>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{conversa.demanda}</p>
            </motion.div>

            {/* Histórico */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
            >
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Histórico de Interações</h3>
              </div>
              <div className="p-6 space-y-3">
                {conversa.historico.map((h) => (
                  <div key={h.id} className="p-4 rounded-xl" style={{ background: "#f8faff", border: "1px solid #dbeafe" }}>
                    <div className="flex items-center justify-between mb-2">
                      <StatusBadge status={h.situacao} size="sm" />
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{h.data}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>{h.obs}</p>
                    <span style={{ fontSize: 12, color: "#64748b" }}><strong>Operador:</strong> {h.operador}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Registrar atividade */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
            >
              <button
                onClick={() => setRegistrando(!registrando)}
                className="w-full px-6 py-4 flex items-center justify-between"
                style={{ background: registrando ? "#0f2744" : "#1d4ed8" }}
              >
                <span className="text-white font-semibold text-sm">Registrar Atividade</span>
                <ChevronDown className="text-white w-4 h-4 transition-transform"
                  style={{ transform: registrando ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>
              <AnimatePresence>
                {registrando && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                          Nova Situação
                        </label>
                        <select value={novaSituacao} onChange={(e) => setNovaSituacao(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                          style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                        >
                          <option value="">Selecione...</option>
                          {conversa.situacoesDisponiveis.map((s) => (
                            <option key={s.id} value={s.label}>{s.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Campos condicionais */}
                      {showDiv === "conversao" && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                          <p className="text-xs font-semibold mb-3" style={{ color: "#14532D" }}>Dados da Conversão</p>
                          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#64748b" }}>
                                Sequência da OS
                              </label>
                              <input type="text" placeholder="Ex: 63220"
                                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                                style={{ borderColor: "#e2e8f0", color: "#0f172a" }} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#64748b" }}>
                                Valor (R$)
                              </label>
                              <input type="text" placeholder="0,00"
                                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                                style={{ borderColor: "#e2e8f0", color: "#0f172a" }} />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {showDiv === "motivo" && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                          <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                            Motivo
                          </label>
                          <select className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                            style={{ borderColor: "#e2e8f0", color: "#0f172a" }}>
                            <option>Preço alto</option>
                            <option>Não encontrou o produto</option>
                            <option>Comprou na concorrência</option>
                            <option>Sem interesse no momento</option>
                            <option>Outros</option>
                          </select>
                        </motion.div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                          Observações
                        </label>
                        <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                          style={{ borderColor: "#e2e8f0", color: "#0f172a" }} />
                      </div>
                      <div className="flex justify-end">
                        <motion.button
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          disabled={!novaSituacao}
                          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                          style={{ background: "#1d4ed8", opacity: novaSituacao ? 1 : 0.5 }}
                        >
                          Registrar
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-4 h-4" style={{ color: "#1d4ed8" }} />
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Encaminhar Para</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#64748b" }}>Loja</label>
                  <select className="w-full px-3 py-2 rounded-xl text-sm border outline-none" style={{ borderColor: "#e2e8f0", color: "#0f172a" }}>
                    <option>488 — Teresina Shopping</option>
                    <option>1060 — Shopping do Povo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#64748b" }}>Consultor</label>
                  <select className="w-full px-3 py-2 rounded-xl text-sm border outline-none" style={{ borderColor: "#e2e8f0", color: "#0f172a" }}>
                    <option>Ana Souza</option>
                    <option>Carlos Lima</option>
                    <option>Juliana Dias</option>
                  </select>
                </div>
                <button className="w-full px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "#1d4ed8" }}>
                  Encaminhar
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  )
}
