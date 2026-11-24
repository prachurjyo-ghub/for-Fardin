"use client"

import Link from "next/link"
import Image from "next/image"
import { useCallback, useEffect, useMemo, useState } from "react"
import { HiOutlineCube, HiPlus } from "react-icons/hi2"
import { toast } from "sonner"
import { EmptyState } from "@/components/shared/empty-state"
import { FormControl, FormSelect, Field, SearchControl } from "@/components/shared/form-control"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PortalButton } from "@/components/shared/portal-button"
import { PageSkeleton } from "@/components/shared/skeletons"
import { StatusBadge } from "@/components/shared/status-badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ListingImagePicker, type PendingListingImage } from "@/components/features/listing-image-picker"
import { errorMessage } from "@/lib/services/auth"
import { adjustStock, createOffering, deleteListingImage, getCatalogue, getInventory, reorderListingImages, updateOffering, uploadListingImage } from "@/lib/services/inventory"
import type { CatalogueProduct, InventoryItem } from "@/lib/types"
import { useAuth } from "@/providers/auth-provider"

const classificationLabel = {
  NEW_GENUINE: "New / Genuine",
  NEW_AFTERMARKET: "New Aftermarket / Compatible",
  USED: "Used part",
} as const

type Classification = keyof typeof classificationLabel

const blank = {
  productId: "",
  classification: "NEW_GENUINE" as Classification,
  sku: "",
  price: "",
  stock: 1,
  minimumStock: 0,
  condition: "USED" as "NEW" | "USED" | "RECONDITIONED",
  preparationTime: "",
  notes: "",
  publish: false,
}

function eligibility(item: InventoryItem) {
  if (item.listingClassification === "USED") return "Quote-based"
  if (item.moderationStatus === "REJECTED") return "Rejected"
  if (item.moderationStatus === "NOT_REVIEWED" && item.publicationStatus === "PUBLISHED") return "Pending review"
  if (item.commissionEligibility.eligible) return "Eligible"
  if (item.commissionEligibility.reason === "INSUFFICIENT_CREDITS") return "Insufficient credits"
  return "Unavailable"
}

export default function ListingsPage() {
  const { membership } = useAuth()
  const businessId = membership?.business.id
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([])
  const [search, setSearch] = useState("")
  const [classification, setClassification] = useState("all")
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [editPrice, setEditPrice] = useState("")
  const [editMinimum, setEditMinimum] = useState(0)
  const [editNotes, setEditNotes] = useState("")
  const [stockDelta, setStockDelta] = useState(0)
  const [busy, setBusy] = useState(false)
  const [images, setImages] = useState<PendingListingImage[]>([])
  const [editImages, setEditImages] = useState<PendingListingImage[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const [inventory, products] = await Promise.all([
        getInventory(businessId),
        getCatalogue(businessId),
      ])
      setItems(inventory.items)
      setCatalogue(products.items)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.product.name} ${item.sku} ${item.product.brand?.name ?? ""} ${item.product.numbers.map((number) => number.partNumber).join(" ")}`.toLowerCase()
    return (!search || text.includes(search.toLowerCase())) &&
      (classification === "all" || item.listingClassification === classification)
  }), [classification, items, search])

  const catalogueResults = useMemo(() => catalogue.filter((product) => {
    if (!search.trim()) return true
    return `${product.name} ${product.brand?.name ?? ""} ${product.category.name} ${product.numbers.map((number) => number.partNumber).join(" ")}`.toLowerCase().includes(search.toLowerCase())
  }).slice(0, 12), [catalogue, search])

  const selectedProduct = catalogue.find((product) => product.id === form.productId)

  async function createListing() {
    if (!businessId || !selectedProduct) return
    setBusy(true)
    try {
      const listing = await createOffering(businessId, {
        productId: selectedProduct.id,
        sku: form.sku,
        unitPrice: form.classification === "USED" ? "0.00" : form.price,
        condition: form.classification === "USED" ? form.condition : "NEW",
        listingClassification: form.classification,
        publicationStatus: "DRAFT",
        stockQuantity: form.stock,
        minimumStock: form.minimumStock,
        preparationTimeMin: form.preparationTime ? Number(form.preparationTime) : null,
        isAvailable: true,
        notes: form.notes || null,
      })
      for (const image of images) await uploadListingImage(businessId, listing.id, image.blob)
      if (form.publish) await updateOffering(businessId, listing.id, { publicationStatus: "PUBLISHED" })
      toast.success(form.publish ? "Listing submitted and published." : "Listing saved as a draft.")
      setWizardOpen(false)
      setStep(1)
      setForm(blank)
      images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      setImages([])
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function openEdit(item: InventoryItem) {
    setEditing(item)
    setEditPrice(item.unitPrice)
    setEditMinimum(item.minimumStock)
    setEditNotes(item.notes ?? "")
    setStockDelta(0)
    setEditImages([])
  }

  async function saveEdit() {
    if (!businessId || !editing) return
    setBusy(true)
    try {
      await updateOffering(businessId, editing.id, {
        unitPrice: editing.listingClassification === "USED" ? undefined : editPrice,
        minimumStock: editMinimum,
        notes: editNotes || null,
      })
      if (stockDelta) {
        await adjustStock(businessId, editing.id, stockDelta, "Supplier stock update")
      }
      for (const image of editImages) await uploadListingImage(businessId, editing.id, image.blob)
      toast.success("Listing updated.")
      setEditing(null)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function removeExistingImage(imageId: string) {
    if (!businessId || !editing) return
    try {
      await deleteListingImage(businessId, editing.id, imageId)
      setEditing({ ...editing, images: editing.images.filter((image) => image.id !== imageId) })
    } catch (error) { toast.error(errorMessage(error)) }
  }

  async function moveExistingImage(index: number, direction: -1 | 1) {
    if (!businessId || !editing) return
    const target = index + direction
    if (target < 0 || target >= editing.images.length) return
    const next = [...editing.images]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    try {
      const reordered = await reorderListingImages(businessId, editing.id, next.map((image) => image.id))
      setEditing({ ...editing, images: reordered })
    } catch (error) { toast.error(errorMessage(error)) }
  }

  async function togglePublication(item: InventoryItem) {
    if (!businessId) return
    try {
      await updateOffering(businessId, item.id, {
        publicationStatus: item.publicationStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
      })
      toast.success(item.publicationStatus === "PUBLISHED" ? "Listing unpublished." : "Listing published.")
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="CATALOGUE & STOCK"
        title="My listings"
        description="Publish catalogue-linked products, keep stock current, and see whether fixed-price listings have enough commission credits."
        actions={<PortalButton variant="primary" onClick={() => { setSearch(""); setWizardOpen(true) }}><HiPlus /> Add listing</PortalButton>}
      />

      <Panel>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <SearchControl className="h-10 min-w-[240px] flex-1 rounded-xl bg-canvas" placeholder="Search product, part number, brand or SKU" value={search} onChange={(event) => setSearch(event.target.value)} />
          <FormSelect value={classification} onChange={(event) => setClassification(event.target.value)}>
            <option value="all">All classifications</option>
            <option value="NEW_GENUINE">New / Genuine</option>
            <option value="NEW_AFTERMARKET">Aftermarket / Compatible</option>
            <option value="USED">Used parts</option>
          </FormSelect>
        </div>

        {filtered.length ? (
          <div className="divide-y divide-line">
            {filtered.map((item) => (
              <article key={item.id} className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(110px,0.65fr))_auto] md:items-center">
                <div className="flex gap-3">
                  {item.images[0] ? <Image src={item.images[0].url} alt="" width={64} height={64} unoptimized className="size-16 shrink-0 rounded-lg object-cover" /> : null}
                  <div>
                  <p className="font-bold text-ink">{item.product.name}</p>
                  <p className="mt-1 text-xs text-muted-text">{item.product.brand?.name ?? "Unbranded"} · {item.product.numbers[0]?.partNumber ?? item.sku} · {item.product.category.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2"><StatusBadge status={item.listingClassification ? classificationLabel[item.listingClassification] : "Unclassified"} /><StatusBadge status={item.publicationStatus} /></div>
                  </div>
                </div>
                <div><span className="text-[10px] font-bold uppercase text-muted-text">Price</span><p className="mt-1 font-bold">{item.listingClassification === "USED" ? "Quote-based" : `৳${item.unitPrice}`}</p></div>
                <div><span className="text-[10px] font-bold uppercase text-muted-text">Available</span><p className="mt-1 font-bold">{item.availableQuantity}</p></div>
                <div><span className="text-[10px] font-bold uppercase text-muted-text">Credit status</span><p className="mt-1 text-sm font-semibold">{eligibility(item)}</p>{item.commissionEligibility.requiredCredit ? <p className="text-xs text-muted-text">{item.commissionEligibility.requiredCredit} credits / unit</p> : null}</div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {item.commissionEligibility.reason === "INSUFFICIENT_CREDITS" ? <Link href="/credit-wallet" className="text-xs font-bold text-blue">Top up</Link> : null}
                  <PortalButton size="sm" onClick={() => openEdit(item)}>Edit</PortalButton>
                  <PortalButton size="sm" variant="primary" onClick={() => void togglePublication(item)}>{item.publicationStatus === "PUBLISHED" ? "Unpublish" : "Publish"}</PortalButton>
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState icon={<HiOutlineCube />} title="No listings found" description="Add a listing from the governed PartsArc catalogue or adjust your filters." />}
      </Panel>

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Add listing · Step {step} of 5</DialogTitle></DialogHeader>
          <div className="mb-4 grid grid-cols-5 gap-2">{[1,2,3,4,5].map((value) => <div key={value} className={`h-1.5 rounded-full ${value <= step ? "bg-blue" : "bg-line"}`} />)}</div>
          {step === 1 ? <div className="space-y-3">
            <Field label="Find a product"><SearchControl placeholder="Search name, part number, brand or category" value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
            <div className="max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">{catalogueResults.map((product) => <button type="button" key={product.id} onClick={() => setForm((value) => ({ ...value, productId: product.id }))} className={`block w-full p-3 text-left ${form.productId === product.id ? "bg-blue-2" : "hover:bg-canvas"}`}><b className="text-sm">{product.name}</b><span className="mt-1 block text-xs text-muted-text">{product.brand?.name ?? "Unbranded"} · {product.numbers[0]?.partNumber ?? product.catalogueCode ?? "No part number"} · {product.category.name}</span></button>)}</div>
            {!catalogueResults.length ? <p className="text-sm text-muted-text">No catalogue match. Use Category requests from Business & Account to ask PartsArc to add governed catalogue data.</p> : null}
          </div> : null}
          {step === 2 ? <div className="grid gap-3">{(Object.keys(classificationLabel) as Classification[]).map((value) => <button type="button" key={value} onClick={() => setForm((current) => ({ ...current, classification: value, condition: value === "USED" ? "USED" : "NEW" }))} className={`rounded-xl border p-4 text-left ${form.classification === value ? "border-blue bg-blue-2" : "border-line"}`}><b>{classificationLabel[value]}</b><p className="mt-1 text-sm text-muted-text">{value === "USED" ? "Quote-based pricing for used, salvaged or reconditioned parts." : value === "NEW_GENUINE" ? "A properly identified genuine new part." : "A legitimate new compatible replacement part."}</p></button>)}</div> : null}
          {step === 3 ? <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Supplier SKU"><FormControl required value={form.sku} onChange={(event) => setForm((value) => ({ ...value, sku: event.target.value }))} /></Field>
            {form.classification !== "USED" ? <Field label="Selling price (BDT)"><FormControl required inputMode="decimal" value={form.price} onChange={(event) => setForm((value) => ({ ...value, price: event.target.value }))} /></Field> : <Field label="Condition"><FormSelect value={form.condition} onChange={(event) => setForm((value) => ({ ...value, condition: event.target.value as typeof value.condition }))}><option value="USED">Used</option><option value="RECONDITIONED">Reconditioned</option></FormSelect></Field>}
            <Field label="Stock quantity"><FormControl type="number" min={0} value={form.stock} onChange={(event) => setForm((value) => ({ ...value, stock: Number(event.target.value) }))} /></Field>
            <Field label="Low-stock alert at"><FormControl type="number" min={0} value={form.minimumStock} onChange={(event) => setForm((value) => ({ ...value, minimumStock: Number(event.target.value) }))} /></Field>
            <Field label="Preparation time (minutes)"><FormControl type="number" min={0} value={form.preparationTime} onChange={(event) => setForm((value) => ({ ...value, preparationTime: event.target.value }))} /></Field>
            <Field className="sm:col-span-2" label={form.classification === "USED" ? "Condition, compatibility and warranty notes" : "Compatibility and listing notes"}><Textarea value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} /></Field>
          </div> : null}
          {step === 4 ? <ListingImagePicker value={images} onChange={setImages} /> : null}
          {step === 5 ? <div className="space-y-4 rounded-xl border border-line p-4"><div><span className="text-xs text-muted-text">Product</span><p className="font-bold">{selectedProduct?.name}</p></div><div><span className="text-xs text-muted-text">Classification</span><p className="font-bold">{classificationLabel[form.classification]}</p></div><div><span className="text-xs text-muted-text">Photos</span><p className="font-bold">{images.length} image{images.length === 1 ? "" : "s"}</p></div><div><span className="text-xs text-muted-text">Commercial details</span><p className="font-bold">{form.classification === "USED" ? "Quote-based" : `৳${form.price}`} · {form.stock} available</p></div><label className="flex items-start gap-3 rounded-xl bg-canvas p-3 text-sm"><input type="checkbox" className="mt-1" checked={form.publish} onChange={(event) => setForm((value) => ({ ...value, publish: event.target.checked }))} /><span><b>Publish after saving</b><span className="block text-muted-text">The listing will show its real moderation status. Rejected listings cannot be published.</span></span></label></div> : null}
          <DialogFooter>
            {step > 1 ? <PortalButton onClick={() => setStep((value) => value - 1)}>Back</PortalButton> : null}
            {step < 5 ? <PortalButton variant="primary" disabled={(step === 1 && !form.productId) || (step === 3 && (!form.sku || (form.classification !== "USED" && !form.price))) || (step === 4 && images.length === 0)} onClick={() => setStep((value) => value + 1)}>Continue</PortalButton> : <PortalButton variant="primary" disabled={busy} onClick={() => void createListing()}>{busy ? "Saving…" : form.publish ? "Save & publish" : "Save draft"}</PortalButton>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editing?.product.name}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {editing?.listingClassification !== "USED" ? <Field label="Selling price (BDT)"><FormControl value={editPrice} onChange={(event) => setEditPrice(event.target.value)} /></Field> : null}
            <Field label="Stock change"><FormControl type="number" value={stockDelta} onChange={(event) => setStockDelta(Number(event.target.value))} /><span className="text-xs text-muted-text">Use a positive number to add stock or a negative number to remove it.</span></Field>
            <Field label="Low-stock alert at"><FormControl type="number" min={0} value={editMinimum} onChange={(event) => setEditMinimum(Number(event.target.value))} /></Field>
            <Field className="sm:col-span-2" label="Listing notes"><Textarea value={editNotes} onChange={(event) => setEditNotes(event.target.value)} /></Field>
            <div className="sm:col-span-2"><p className="mb-2 text-sm font-semibold">Current photos</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{editing?.images.map((image, index) => <div key={image.id} className="rounded-xl border border-line p-2"><Image src={image.url} alt="" width={320} height={320} unoptimized className="aspect-square w-full rounded-lg object-cover" /><div className="mt-2 flex justify-between text-xs"><button disabled={index === 0} onClick={() => void moveExistingImage(index, -1)}>←</button><button disabled={index === editing.images.length - 1} onClick={() => void moveExistingImage(index, 1)}>→</button><button className="text-red-600" onClick={() => void removeExistingImage(image.id)}>Remove</button></div></div>)}</div></div>
            {((editing?.images.length ?? 0) + editImages.length) < 4 ? <div className="sm:col-span-2"><ListingImagePicker value={editImages} onChange={setEditImages} /></div> : null}
          </div>
          <DialogFooter><PortalButton variant="primary" disabled={busy} onClick={() => void saveEdit()}>{busy ? "Saving…" : "Save changes"}</PortalButton></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
