"use client"

import { use, useState, useEffect, useCallback, useRef } from "react"
import { Loader2, Printer } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import {
  fmtDate, fmtDateTime, fmtOs, fmtPhone, fmtCpf,
  type ServiceOrder, type ServiceOrderHistory,
} from "@/lib/types"

// Página de impressão — sem Header/Sidebar, formato A4
// Abre via window.open('/imprimir/pedidos/[id]', '_blank')

export default function ImprimirPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const printedRef = useRef(false)

  const [order,     setOrder]     = useState<ServiceOrder | null>(null)
  const [histories, setHistories] = useState<ServiceOrderHistory[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const sb = createSupabaseBrowserClient()
    const [oRes, hRes] = await Promise.all([
      sb.from("service_orders")
        .select(`
          *,
          customer:customers!customer_id(id,name,cpf,phone),
          store:stores!store_id(id,code,name),
          employee:employees!employee_id(id,full_name,short_name),
          laboratory:laboratories!laboratory_id(id,name)
        `)
        .eq("id", id)
        .single(),
      sb.from("service_order_histories")
        .select("*")
        .eq("service_order_id", id)
        .order("created_at", { ascending: true }),
    ])

    if (oRes.error || !oRes.data) {
      setError("Pedido não encontrado.")
    } else {
      setOrder(oRes.data as ServiceOrder)
      setHistories((hRes.data ?? []) as ServiceOrderHistory[])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  // Aciona impressão automaticamente após carregar os dados
  useEffect(() => {
    if (!loading && order && !printedRef.current) {
      printedRef.current = true
      setTimeout(() => window.print(), 400)
    }
  }, [loading, order])

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Loader2 style={{ width: 32, height: 32, color: "#1d4ed8" }} className="animate-spin" />
    </div>
  )

  if (error || !order) return (
    <div style={{ textAlign: "center", padding: 40 }}>
      <p style={{ color: "#dc2626" }}>{error ?? "Pedido não encontrado."}</p>
    </div>
  )

  const os           = fmtOs(order.os_number, order.os_sequence)
  const clienteName  = order.customer_name ?? order.customer?.name ?? "—"
  const clienteCpf   = fmtCpf(order.customer?.cpf)
  const clienteTel   = fmtPhone(order.customer?.phone)
  const vendedor     = order.employee_name ?? order.employee?.short_name ?? order.employee?.full_name ?? "—"
  const loja         = order.store ? `${order.store.code} — ${order.store.name}` : "—"
  const laboratorio  = order.laboratory?.name ?? "—"
  const labOs        = order.lab_os_number ?? "—"
  const prazo        = fmtDate(order.scheduled_delivery)
  const emissao      = fmtDate(order.purchase_date)
  const situacao     = order.situation ?? "Aguardando"

  return (
    <>
      {/* ── CSS da impressão ─────────────────────────────────────────────── */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Open Sans', Arial, sans-serif; background: #fff; color: #111; }

        @media screen {
          body { background: #e5e7eb; padding: 24px; }
          .sheet { max-width: 794px; margin: 0 auto; background: #fff;
                   box-shadow: 0 4px 24px rgba(0,0,0,0.15); border-radius: 4px; }
          .no-print { display: flex; justify-content: center; gap: 12px; padding: 16px 0; max-width: 794px; margin: 0 auto; }
        }

        @media print {
          body { background: #fff; padding: 0; }
          .no-print { display: none !important; }
          .sheet { box-shadow: none; border-radius: 0; }
          @page { size: A4 portrait; margin: 14mm 12mm; }
        }

        .sheet { padding: 32px; }

        /* Cabeçalho */
        .hdr { display: flex; align-items: flex-start; justify-content: space-between;
               padding-bottom: 14px; border-bottom: 3px solid #0f2744; margin-bottom: 20px; }
        .hdr-nome { font-size: 28px; font-weight: 800; color: #0f2744; letter-spacing: -0.5px; }
        .hdr-sub  { font-size: 10px; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 2px; }
        .hdr-info { text-align: right; font-size: 10px; color: #64748b; line-height: 1.8; }

        /* Título OS */
        .os-topo { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
        .os-num  { font-size: 22px; font-weight: 800; color: #0f2744; }
        .badge   { display: inline-block; padding: 3px 12px; border-radius: 99px;
                   font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
        .badge-urgente { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

        /* Seções */
        .section { margin-bottom: 16px; }
        .sec-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em;
                     color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 20px; }
        .field { margin-bottom: 4px; }
        .fl { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 1px; }
        .fv { font-size: 12px; color: #0f172a; font-weight: 500; }
        .fv-bold { font-weight: 700; }

        /* Histórico */
        .hist-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .hist-table th { text-align: left; font-size: 8px; text-transform: uppercase;
                          letter-spacing: 0.08em; color: #94a3b8; padding: 4px 6px;
                          border-bottom: 1px solid #e2e8f0; }
        .hist-table td { padding: 5px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .hist-table tr:last-child td { border-bottom: none; }

        /* Observações */
        .obs-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;
                   padding: 10px 12px; font-size: 11px; color: #475569; font-style: italic;
                   margin-top: 10px; }

        /* Linha de assinatura */
        .assinaturas { display: grid; grid-template-columns: 1fr 1fr 1fr;
                       gap: 24px; margin-top: 40px; }
        .assinatura-campo { border-top: 1px solid #374151; padding-top: 6px;
                            text-align: center; font-size: 9px; color: #64748b; }

        /* Rodapé */
        .rodape { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px;
                  font-size: 8px; color: #94a3b8; text-align: center; }

        /* Botão na tela */
        .btn-print { display: inline-flex; align-items: center; gap: 6px; background: #0f2744;
                     color: #fff; border: none; border-radius: 10px; padding: 10px 22px;
                     font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn-close { display: inline-flex; align-items: center; gap: 6px; background: transparent;
                     color: #475569; border: 1px solid #e2e8f0; border-radius: 10px;
                     padding: 10px 22px; font-size: 13px; cursor: pointer; font-family: inherit; }
      `}</style>

      {/* Botões visíveis apenas na tela */}
      <div className="no-print">
        <button className="btn-print" onClick={() => window.print()}>
          <Printer size={14} /> Imprimir
        </button>
        <button className="btn-close" onClick={() => window.close()}>
          Fechar
        </button>
      </div>

      {/* Folha A4 */}
      <div className="sheet">

        {/* ── Cabeçalho Ótica Carol ───────────────────────────────────── */}
        <div className="hdr">
          <div>
            <div className="hdr-nome">ÓTICA CAROL</div>
            <div className="hdr-sub">Qualidade e Cuidado com sua Visão</div>
          </div>
          <div className="hdr-info">
            <div><strong>Teresina — Piauí</strong></div>
            <div>CNPJ: 00.000.000/0001-00</div>
            <div>Tel: (86) 0000-0000</div>
            <div style={{ marginTop: 4 }}>Emitido em: {fmtDateTime(new Date().toISOString())}</div>
          </div>
        </div>

        {/* ── Número e status da OS ───────────────────────────────────── */}
        <div className="os-topo">
          <span className="os-num">OS Nº {os}</span>
          <span className="badge" style={badgeStyle(situacao)}>{situacao}</span>
          {order.urgent && <span className="badge badge-urgente">⚠ Urgente</span>}
        </div>

        {/* ── Dados do cliente ────────────────────────────────────────── */}
        <div className="section">
          <div className="sec-title">Dados do Cliente</div>
          <div className="grid3">
            <div className="field"><div className="fl">Nome</div><div className="fv">{clienteName}</div></div>
            <div className="field"><div className="fl">CPF</div><div className="fv">{clienteCpf}</div></div>
            <div className="field"><div className="fl">Telefone</div><div className="fv">{clienteTel}</div></div>
          </div>
        </div>

        {/* ── Detalhes do pedido ──────────────────────────────────────── */}
        <div className="section">
          <div className="sec-title">Detalhes do Pedido</div>
          <div className="grid3">
            <div className="field"><div className="fl">Loja</div><div className="fv">{loja}</div></div>
            <div className="field"><div className="fl">Vendedor(a)</div><div className="fv">{vendedor}</div></div>
            <div className="field"><div className="fl">Data da Compra</div><div className="fv">{emissao}</div></div>
            <div className="field"><div className="fl">Laboratório</div><div className="fv">{laboratorio}</div></div>
            <div className="field"><div className="fl">OS Laboratório</div><div className="fv">{labOs}</div></div>
            <div className="field">
              <div className="fl">Prazo de Entrega</div>
              <div className="fv fv-bold">{prazo}</div>
            </div>
          </div>
          {order.notes && (
            <div className="obs-box" style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>
                Observações:
              </strong>{" "}
              {order.notes}
            </div>
          )}
        </div>

        {/* ── Histórico de movimentações ──────────────────────────────── */}
        {histories.length > 0 && (
          <div className="section">
            <div className="sec-title">Histórico de Movimentações</div>
            <table className="hist-table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Situação</th>
                  <th>Operador</th>
                  <th>OS Lab</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {histories.map(h => (
                  <tr key={h.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(h.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{h.situation}</td>
                    <td>{h.operator_name ?? "—"}</td>
                    <td>{h.lab_os_number ?? "—"}</td>
                    <td style={{ fontStyle: h.notes ? "italic" : "normal", color: "#475569" }}>
                      {h.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Espaço para receita ─────────────────────────────────────── */}
        <div className="section" style={{ marginTop: 8 }}>
          <div className="sec-title">Receita / Prescrição</div>
          <div style={{ height: 60, border: "1px dashed #e2e8f0", borderRadius: 6,
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>— campo reservado —</span>
          </div>
        </div>

        {/* ── Linhas de assinatura ────────────────────────────────────── */}
        <div className="assinaturas">
          <div className="assinatura-campo">Assinatura do Cliente</div>
          <div className="assinatura-campo">Responsável pela Entrega</div>
          <div className="assinatura-campo">Optometrista</div>
        </div>

        {/* ── Rodapé ─────────────────────────────────────────────────── */}
        <div className="rodape">
          Documento gerado em {fmtDateTime(new Date().toISOString())} · OS {os} · ERP Ótica Carol
        </div>
      </div>
    </>
  )
}

function badgeStyle(sit: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    "Aguardando":        ["#fffbeb", "#b45309"],
    "Em Andamento":      ["#eff6ff", "#1d4ed8"],
    "No Laboratório":    ["#f5f3ff", "#7c3aed"],
    "Surfaçagem":        ["#f5f3ff", "#7c3aed"],
    "Pronto p/ Entrega": ["#f0fdf4", "#16a34a"],
    "Entregue":          ["#f0fdf4", "#15803d"],
    "Cancelado":         ["#fef2f2", "#dc2626"],
  }
  const [bg, color] = map[sit] ?? ["#f1f5f9", "#475569"]
  return { background: bg, color, border: `1px solid ${color}55` }
}
