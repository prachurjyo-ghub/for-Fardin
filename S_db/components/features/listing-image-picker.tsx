"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

const MAX_SOURCE_BYTES = 8 * 1024 * 1024
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024
const MAX_PIXELS = 24_000_000
const MAX_DIMENSION = 8_000
const OUTPUT_EDGE = 1_600

export type PendingListingImage = { id: string; blob: Blob; previewUrl: string; width: number; height: number }

async function optimize(file: File): Promise<PendingListingImage> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_SOURCE_BYTES) throw new Error("Choose a JPEG, PNG or WebP file no larger than 8 MiB.")
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width > MAX_DIMENSION || bitmap.height > MAX_DIMENSION || bitmap.width * bitmap.height > MAX_PIXELS) throw new Error("Image dimensions are too large.")
    const scale = Math.min(1, OUTPUT_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d", { alpha: false })
    if (!context) throw new Error("This browser cannot process the image.")
    context.drawImage(bitmap, 0, 0, width, height)
    let quality = 0.84
    let blob: Blob | null = null
    while (quality >= 0.55) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality))
      if (blob && blob.size <= MAX_OUTPUT_BYTES) break
      quality -= 0.08
    }
    if (!blob || blob.size > MAX_OUTPUT_BYTES) throw new Error("The optimized image is still above 2 MiB. Choose a simpler or smaller photo.")
    return { id: crypto.randomUUID(), blob, previewUrl: URL.createObjectURL(blob), width, height }
  } finally { bitmap.close() }
}

export function ListingImagePicker({ value, onChange }: { value: PendingListingImage[]; onChange: (images: PendingListingImage[]) => void }) {
  const [error, setError] = useState("")
  const current = useRef(value)
  useEffect(() => { current.current = value }, [value])
  useEffect(() => () => current.current.forEach((image) => URL.revokeObjectURL(image.previewUrl)), [])

  async function select(files: FileList | null) {
    if (!files) return
    setError("")
    try {
      if (files.length > 4 - value.length) throw new Error("Each listing can have at most four images.")
      const next: PendingListingImage[] = []
      for (const file of Array.from(files)) next.push(await optimize(file))
      onChange([...value, ...next])
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The image could not be processed.") }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    onChange(next)
  }

  function remove(index: number) {
    URL.revokeObjectURL(value[index]!.previewUrl)
    onChange(value.filter((_, candidate) => candidate !== index))
  }

  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{value.map((image, index) => <div key={image.id} className="overflow-hidden rounded-xl border border-line bg-canvas">
      <div className="relative aspect-square"><Image src={image.previewUrl} alt={`Listing preview ${index + 1}`} fill sizes="(min-width: 640px) 25vw, 50vw" unoptimized className="object-cover" />{index === 0 ? <span className="absolute left-2 top-2 rounded bg-blue px-2 py-1 text-[10px] font-bold text-white">PRIMARY</span> : null}</div>
      <div className="flex justify-center gap-2 p-2 text-xs"><button type="button" aria-label="Move image left" disabled={index === 0} onClick={() => move(index, -1)}>←</button><button type="button" aria-label="Move image right" disabled={index === value.length - 1} onClick={() => move(index, 1)}>→</button><button type="button" className="text-red-600" onClick={() => remove(index)}>Remove</button></div>
    </div>)}</div>
    {value.length < 4 ? <label className="block cursor-pointer rounded-xl border border-dashed border-line p-4 text-center text-sm font-semibold hover:bg-canvas">Add photos<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void select(event.target.files)} /></label> : null}
    <p className="text-xs text-muted-text">1–4 photos. JPEG, PNG or WebP up to 8 MiB; optimized in your browser to WebP. The first photo is primary.</p>
    {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
  </div>
}
