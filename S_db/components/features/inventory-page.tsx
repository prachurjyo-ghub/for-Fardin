"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { HiCheck, HiExclamationTriangle, HiSquares2X2, HiXMark } from "react-icons/hi2"
import { DataTabs } from "@/components/shared/data-tabs"
import { Field, FormControl, FormSelect, SearchControl } from "@/components/shared/form-control"
import { FilterToolbar } from "@/components/shared/filter-toolbar"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PortalButton } from "@/components/shared/portal-button"
import { PageSkeleton } from "@/components/shared/skeletons"
import { StatusBadge } from "@/components/shared/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { adjustStock, bulkUpdate, confirmCsv, createOffering, downloadCsvTemplate, getCatalogue, getInventory, previewCsv, stockStatus, updateOffering } from "@/lib/services/inventory"
import { errorMessage } from "@/lib/services/auth"
import type { CatalogueProduct, CsvPreview, InventoryItem } from "@/lib/types"
import { useAuth } from "@/providers/auth-provider"

export default function InventoryPage() {
  const { account, membership } = useAuth()
  const businessId = membership?.business.id
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([])
  const [tab, setTab] = useState("all")
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [csv, setCsv] = useState<CsvPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ productId: "", sku: "", unitPrice: "0.00", condition: "NEW", stockQuantity: 0, minimumStock: 0, preparationTimeMin: "", isAvailable: true, notes: "", delta: 0, reason: "" })

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const [inventory, products] = await Promise.all([getInventory(businessId), getCatalogue(businessId)])
      setItems(inventory.items); setCatalogue(products.items)
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setLoading(false) }
  }, [businessId])
  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => items.filter((item) => {
    const q = search.toLowerCase()
    const matches = !q || `${item.product.name} ${item.sku} ${item.product.brand?.name ?? ""}`.toLowerCase().includes(q)
    return matches && (tab === "all" || (tab === "low" && item.availabilityStatus === "LOW_STOCK") || (tab === "out" && item.availabilityStatus === "OUT_OF_STOCK"))
  }), [items, search, tab])
  const counts = { low: items.filter((i) => i.availabilityStatus === "LOW_STOCK").length, out: items.filter((i) => i.availabilityStatus === "OUT_OF_STOCK").length, available: items.filter((i) => i.availableQuantity > 0 && i.isAvailable).length }

  const openEdit = (item: InventoryItem) => {
    setEditing(item)
    setForm({ productId: item.product.id, sku: item.sku, unitPrice: item.unitPrice, condition: item.condition, stockQuantity: item.stockQuantity, minimumStock: item.minimumStock, preparationTimeMin: item.preparationTimeMin?.toString() ?? "", isAvailable: item.isAvailable, notes: item.notes ?? "", delta: 0, reason: "" })
  }
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!businessId) return
    setBusy(true)
    try {
      if (editing) {
        await updateOffering(businessId, editing.id, { unitPrice: form.unitPrice, minimumStock: form.minimumStock, preparationTimeMin: form.preparationTimeMin === "" ? null : Number(form.preparationTimeMin), isAvailable: form.isAvailable, notes: form.notes || null })
        if (form.delta !== 0) await adjustStock(businessId, editing.id, form.delta, form.reason)
        toast.success("Offering updated. Reserved stock was not modified.")
      } else {
        await createOffering(businessId, { productId: form.productId, sku: form.sku, unitPrice: form.unitPrice, condition: form.condition, stockQuantity: form.stockQuantity, minimumStock: form.minimumStock, preparationTimeMin: form.preparationTimeMin === "" ? null : Number(form.preparationTimeMin), isAvailable: form.isAvailable, notes: form.notes || null })
        toast.success("Catalogue offering added.")
      }
      setEditing(null); setAdding(false); await load()
    } catch (error) { toast.error(errorMessage(error)) } finally { setBusy(false) }
  }
  const csvFile = async (file?: File) => {
    if (!businessId || !file) return
    setBusy(true); try { setCsv(await previewCsv(businessId, file)) } catch (error) { toast.error(errorMessage(error)) } finally { setBusy(false) }
  }
  if (loading) return <PageSkeleton />
  return <div>
    <PageHeader eyebrow="CATALOGUE" title="Inventory & availability" description="Commercial offerings are linked to the shared catalogue. Physical, reserved and available stock remain separate."
      actions={<><input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void csvFile(e.target.files?.[0])} /><PortalButton onClick={() => fileRef.current?.click()}>Import CSV</PortalButton><PortalButton onClick={() => businessId && void downloadCsvTemplate(businessId)}>Template</PortalButton><PortalButton variant="primary" onClick={() => { setAdding(true); setForm({ productId: catalogue[0]?.id ?? "", sku: "", unitPrice: "0.00", condition: "NEW", stockQuantity: 0, minimumStock: 0, preparationTimeMin: "", isAvailable: true, notes: "", delta: 0, reason: "" }) }}>Add offering</PortalButton></>} />
    <section className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Offerings" value={String(items.length)} meta="Active records" icon={<HiSquares2X2 />} />
      <MetricCard label="Available" value={String(counts.available)} meta="After reservations" icon={<HiCheck />} />
      <MetricCard label="Low stock" value={String(counts.low)} meta="At or below minimum" bad icon={<HiExclamationTriangle />} />
      <MetricCard label="Out of stock" value={String(counts.out)} meta="No available quantity" bad icon={<HiXMark />} />
    </section>
    <Panel>
      <DataTabs value={tab} onChange={setTab} tabs={[{ id: "all", label: "All inventory" }, { id: "low", label: "Low stock", count: counts.low }, { id: "out", label: "Out of stock", count: counts.out }]} />
      <FilterToolbar><SearchControl className="min-w-[220px] flex-1" placeholder="Search product, SKU or brand" value={search} onChange={(e) => setSearch(e.target.value)} /><PortalButton disabled={!filtered.length} onClick={() => { const value = prompt("Minimum stock for visible offerings"); if (businessId && value != null) void bulkUpdate(businessId, filtered, Number(value)).then(load).then(() => toast.success("Bulk thresholds updated.")).catch((e) => toast.error(errorMessage(e))) }}>Bulk threshold</PortalButton></FilterToolbar>
      {!filtered.length ? <p className="p-8 text-center text-sm text-muted-text">No inventory offerings match this view.</p> : <div className="overflow-auto"><table className="w-full border-collapse whitespace-nowrap"><thead><tr>{["Product","SKU","Condition","Physical","Reserved","Available","Minimum","Price","Status","Action"].map((h)=><th key={h} className="bg-canvas px-[15px] py-3 text-left text-[10px] font-bold text-muted-text">{h}</th>)}</tr></thead><tbody>{filtered.map((item)=><tr key={item.id}><td className="border-t border-line px-[15px] py-3 text-xs cell-title">{item.product.name}</td><td className="border-t border-line px-[15px] py-3 text-xs">{item.sku}</td><td className="border-t border-line px-[15px] py-3 text-xs">{item.condition}</td><td className="border-t border-line px-[15px] py-3 text-xs">{item.stockQuantity}</td><td className="border-t border-line px-[15px] py-3 text-xs">{item.reservedQuantity}</td><td className="border-t border-line px-[15px] py-3 text-xs cell-title">{item.availableQuantity}</td><td className="border-t border-line px-[15px] py-3 text-xs">{item.minimumStock}</td><td className="border-t border-line px-[15px] py-3 text-xs">৳{item.unitPrice}</td><td className="border-t border-line px-[15px] py-3 text-xs"><StatusBadge status={stockStatus(item)} /></td><td className="border-t border-line px-[15px] py-3"><PortalButton size="sm" onClick={()=>openEdit(item)}>Update</PortalButton></td></tr>)}</tbody></table></div>}
    </Panel>
    <Dialog open={adding || !!editing} onOpenChange={(open)=>{ if(!open){setAdding(false);setEditing(null)} }}><DialogContent className="sm:max-w-[720px]"><DialogHeader><div className="eyebrow">{editing ? "UPDATE OFFERING" : "CATALOGUE SELECTION"}</div><DialogTitle>{editing?.product.name ?? "Add inventory offering"}</DialogTitle></DialogHeader><form onSubmit={save} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      {!editing && <Field label="Catalogue product" full><FormSelect required value={form.productId} onChange={(e)=>setForm({...form,productId:e.target.value})}>{catalogue.map((p)=><option key={p.id} value={p.id}>{p.name} · {p.numbers.find((n)=>n.isPrimary)?.partNumber ?? p.catalogueCode}</option>)}</FormSelect></Field>}
      {!editing && <><Field label="Supplier SKU"><FormControl required value={form.sku} onChange={(e)=>setForm({...form,sku:e.target.value})}/></Field><Field label="Condition"><FormSelect value={form.condition} onChange={(e)=>setForm({...form,condition:e.target.value})}><option>NEW</option><option>RECONDITIONED</option><option>USED</option></FormSelect></Field><Field label="Opening physical stock"><FormControl type="number" min={0} value={form.stockQuantity} onChange={(e)=>setForm({...form,stockQuantity:Number(e.target.value)})}/></Field></>}
      <Field label="Unit price (BDT)"><FormControl required inputMode="decimal" value={form.unitPrice} onChange={(e)=>setForm({...form,unitPrice:e.target.value})}/></Field><Field label="Minimum stock"><FormControl type="number" min={0} value={form.minimumStock} onChange={(e)=>setForm({...form,minimumStock:Number(e.target.value)})}/></Field><Field label="Preparation minutes"><FormControl type="number" min={0} value={form.preparationTimeMin} onChange={(e)=>setForm({...form,preparationTimeMin:e.target.value})}/></Field>
      {editing && <><Field label="Stock adjustment (+/-)"><FormControl type="number" value={form.delta} onChange={(e)=>setForm({...form,delta:Number(e.target.value)})}/></Field><Field label="Adjustment reason"><FormControl required={form.delta!==0} value={form.reason} onChange={(e)=>setForm({...form,reason:e.target.value})}/></Field></>}
      <Field label="Availability"><FormSelect value={form.isAvailable ? "yes" : "no"} onChange={(e)=>setForm({...form,isAvailable:e.target.value==="yes"})}><option value="yes">Available</option><option value="no">Manually unavailable</option></FormSelect></Field><Field label="Notes" full><Textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}/></Field>
      <DialogFooter className="sm:col-span-2"><PortalButton type="button" onClick={()=>{setAdding(false);setEditing(null)}}>Cancel</PortalButton><PortalButton type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : "Save"}</PortalButton></DialogFooter>
    </form></DialogContent></Dialog>
    <Dialog open={!!csv} onOpenChange={(open)=>!open&&setCsv(null)}><DialogContent><DialogHeader><div className="eyebrow">CSV PREVIEW</div><DialogTitle>Review before confirmation</DialogTitle></DialogHeader>{csv&&<div className="space-y-3 text-sm"><p>{csv.summary.total} rows · {csv.summary.creates} creates · {csv.summary.updates} updates · {csv.summary.errors} errors</p>{csv.rows.filter((r)=>r.errors.length).map((r)=><p key={r.rowNumber} className="text-danger">Row {r.rowNumber}: {r.errors.join("; ")}</p>)}<p className="text-xs text-muted-text">Confirmation revalidates catalogue and optimistic inventory versions atomically. Reserved stock is never overwritten.</p><DialogFooter><PortalButton onClick={()=>setCsv(null)}>Cancel</PortalButton><PortalButton variant="primary" disabled={busy||csv.summary.errors>0} onClick={()=>{if(!businessId)return;setBusy(true);void confirmCsv(businessId,csv.id).then((r)=>{toast.success(`Imported ${r.created} new and ${r.updated} updated offerings.`);setCsv(null);return load()}).catch((e)=>toast.error(errorMessage(e))).finally(()=>setBusy(false))}}>Confirm import</PortalButton></DialogFooter></div>}</DialogContent></Dialog>
    {account?.role === "SUPPLIER_STAFF" && <p className="mt-4 text-xs text-muted-text">Staff may manage offerings and stock. Only owners can deactivate offerings.</p>}
  </div>
}
