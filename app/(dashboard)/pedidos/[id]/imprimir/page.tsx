"use client"

import { use, useState, useEffect, useCallback, useRef } from "react"
import { Loader2, Printer } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import {
  fmtDate, fmtDateTime, fmtOs, fmtPhone, fmtCpf,
  type ServiceOrder, type ServiceOrderHistory,
} from "@/lib/types"

// Página de impressão — sem Header/Sidebar, formato A4
// Abre via window.open() e aciona window.print() automaticamente

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

  // Aciona impressão após renderizar
  useEffect(() => {
    if (!loading && order && !printedRef.current) {
      printedRef.current = true
      setTimeout(() => window.print(), 400)
    }
  }, [loading, order])

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Loader2 style={{ width: 32, height: 32, color: "#1d4ed8", animation: "spin 1s linear infinite" }} />
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
      {/* ── CSS exclusivo para impressão ── */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Open Sans', Arial, sans-serif; background: #fff; color: #111; }

        @media screen {
          body { background: #e5e7eb; padding: 24px; }
          .sheet { max-width: 794px; margin: 0 auto; background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,0.15); }
          .no-print { display: flex; }
        }

        @media print {
          body { background: #fff; padding: 0; }
          .no-print { display: none !important; }
          .sheet { box-shadow: none; }
          @page { size: A4; margin: 15mm 12mm; }
        }

        .sheet { padding: 32px; }

        /* ── Cabeçalho ─────────────────── */
        .hdr { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 16px; border-bottom: 2px solid #0f2744; margin-bottom: 20px; }
        .hdr-logo-nome { font-size: 26px; font-weight: 800; color: #0f2744; letter-spacing: -0.5px; line-height: 1.1; }
        .hdr-logo-sub  { font-size: 10px; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 2px; }
        .hdr-info { text-align: right; font-size: 10px; color: #64748b; line-height: 1.7; }
        .hdr-info strong { color: #0f172a; }

        /* ── Título OS ─────────────────── */
        .os-titulo { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .os-num { font-size: 22px; font-weight: 800; color: #0f2744; font-variant-numeric: tabular-nums; }
        .os-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .os-urgente { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; margin-left: 4px; }

        /* ── Seções ─────────────────────── */
        .section { margin-bottom: 18px; }
        .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 20px; }
        .field-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 2px; }
        .field-value { font-size: 12px; color: #0f172a; font-weight: 500; }

        /* ── Histórico ─────────────────── */
        .hist-row { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
        .hist-date { color: #64748b; white-space: nowrap; min-width: 110px; }
        .hist-sit  { font-weight: 600; min-width: 130px; }
        .hist-op   { color: #475569; }
        .hist-obs  { color: #475569; font-style: italic; }

        /* ── Assinatura ────────────────── */
        .assinatura { margin-top: 32px; display: flex; gap: 40px; }
        .assinatura-linha { flex: 1; border-top: 1px solid #374151; padding-top: 6px; text-align: center; font-size: 10px; color: #64748b; }

        /* ── Rodapé ─────────────────────── */
        .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #94a3b8; text-align: center; }

        /* ── Botão tela ─────────────────── */
        .no-print { gap: 12px; justify-content: center; padding: 14px 0; max-width: 794px; margin: 0 auto; }
        .btn-print { display: inline-flex; align-items: center; gap: 6px; background: #0f2744; color: #fff; border: none; border-radius: 10px; padding: 10px 22px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-close { display: inline-flex; align-items: center; gap: 6px; background: transparent; color: #475569; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 22px; font-size: 13px; cursor: pointer; }
      `}</style>

      {/* ── Botões visíveis só na tela ── */}
      <div className="no-print">
        <button className="btn-print" onClick={() => window.print()}>
          <Printer size={15} /> Imprimir
        </button>
        <button className="btn-close" onClick={() => window.close()}>
          Fechar
        </button>
      </div>

      {/* ── Folha A4 ── */}
      <div className="sheet">

        {/* Cabeçalho */}
        <div className="hdr">
          <div>
            <div className="hdr-logo-nome">ÓTICA CAROL</div>
            <div className="hdr-logo-sub">Qualidade e Cuidado com sua Visão</div>
          </div>
          <div className="hdr-info">
            <div>Teresina — PI</div>
            <div>CNPJ: 00.000.000/0001-00</div>
            <div>Tel: (86) 0000-0000</div>
            <div style={{ marginTop: 4 }}>
              Emissão: <strong>{fmtDateTime(new Date().toISOString())}</strong>
            </div>
          </div>
        </div>

        {/* Número da OS */}
        <div className="os-titulo">
          <span className="os-num">OS Nº {os}</span>
          <span className="os-badge" style={situacaoBadgeStyle(situacao)}>
            {situacao}
          </span>
          {order.urgent && <span className="os-badge os-urgente">⚠ Urgente</span>}
        </div>

        {/* Cliente */}
        <div className="section">
          <div className="section-title">Dados do Cliente</div>
          <div className="grid3">
            <div>
              <div className="field-label">Nome</div>
              <div className="field-value">{clienteName}</div>
            </div>
            <div>
              <div className="field-label">CPF</div>
              <div className="field-value">{clienteCpf}</div>
            </div>
            <div>
              <div className="field-label">Telefone</div>
              <div className="field-value">{clienteTel}</div>
            </div>
          </div>
        </div>

        {/* Pedido */}
        <div className="section">
          <div className="section-title">Detalhes do Pedido</div>
          <div className="grid3">
            <div>
              <div className="field-label">Loja</div>
              <div className="field-value">{loja}</div>
            </div>
            <div>
              <div className="field-label">Vendedor(a)</div>
              <div className="field-value">{vendedor}</div>
            </div>
            <div>
              <div className="field-label">Data da Compra</div>
              <div className="field-value">{emissao}</div>
            </div>
            <div>
              <div className="field-label">Laboratório</div>
              <div className="field-value">{laboratorio}</div>
            </div>
            <div>
              <div className="field-label">OS Laboratório</div>
              <div className="field-value">{labOs}</div>
            </div>
            <div>
              <div className="field-label">Prazo de Entrega</div>
              <div className="field-value" style={{ fontWeight: 700 }}>{prazo}</div>
            </div>
          </div>
          {order.notes && (
            <div style={{ marginTop: 12 }}>
              <div className="field-label">Observações</div>
              <div className="field-value" style={{ fontStyle: "italic", color: "#475569" }}>{order.notes}</div>
            </div>
          )}
        </div>

        {/* Histórico */}
        {histories.length > 0 && (
          <div className="section">
            <div className="section-title">Histórico de Movimentações</div>
            {histories.map(h => (
              <div key={h.id} className="hist-row">
                <span className="hist-date">{fmtDateTime(h.created_at)}</span>
                <span className="hist-sit">{h.situation}</span>
                {h.operator_name && <span className="hist-op">({h.operator_name})</span>}
                {h.lab_os_number && <span className="hist-op">· Lab: {h.lab_os_number}</span>}
                {h.notes && <span className="hist-obs">· {h.notes}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Assinaturas */}
        <div className="assinatura">
          <div className="assinatura-linha">Assinatura do Cliente</div>
          <div className="assinatura-linha">Assinatura do Responsável</div>
          <div className="assinatura-linha">Assinatura do Optometrista</div>
        </div>

        {/* Rodapé */}
        <div className="footer">
          Documento gerado em {fmtDateTime(new Date().toISOString())} · OS {os} · Sistema ERP Ótica Carol
        </div>
      </div>
    </>
  )
}

// Cor do badge de situação
function situacaoBadgeStyle(sit: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    "Aguardando":        ["#fffbeb", "#d97706"],
    "Em Andamento":      ["#eff6ff", "#1d4ed8"],
    "No Laboratório":    ["#f5f3ff", "#7c3aed"],
    "Surfaçagem":        ["#f5f3ff", "#7c3aed"],
    "Pronto p/ Entrega": ["#f0fdf4", "#16a34a"],
    "Entregue":          ["#f0fdf4", "#15803d"],
    "Cancelado":         ["#fef2f2", "#dc2626"],
  }
  const [bg, color] = map[sit] ?? ["#f1f5f9", "#475569"]
  return { background: bg, color, border: `1px solid ${color}33` }
}
