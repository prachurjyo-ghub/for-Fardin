"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import {
  DetailGrid,
  FormDialog,
  FriendlyEmpty,
  MoreActions,
  SectionCard,
} from "@/components/management";
import { ErrorBox, PageHeader } from "@/components/page";
import { Button, Status } from "@/components/ui";
import { DetailPageSkeleton } from "@/components/skeletons";
import { type Json, type Page } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";

const show = (value: unknown) =>
  value == null || value === "" ? "—" : String(value);
const optionalNumber = (value: string) => (value ? Number(value) : null);

export default function ProductDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const product = useResource<Json>(`/admin/catalogue/products/${id}`);
  const categories = useResource<Page>(
    "/admin/catalogue/categories?page=1&pageSize=100&isActive=true",
  );
  const brands = useResource<Page>(
    "/admin/catalogue/brands?page=1&pageSize=100&isActive=true",
  );
  if (product.loading) return <DetailPageSkeleton />;
  if (product.error || !product.data)
    return (
      <ErrorBox
        message={product.error || "Product not found"}
        retry={() => void product.reload()}
      />
    );
  const row = product.data;
  const numbers = Array.isArray(row.numbers) ? (row.numbers as Json[]) : [];
  const compatibility = Array.isArray(row.compatibility)
    ? (row.compatibility as Json[])
    : [];
  const categoryOptions = (categories.data?.items ?? []).map((item) => ({
    label: show(item.name),
    value: show(item.id),
  }));
  const brandOptions = [
    { label: "No brand", value: "" },
    ...(brands.data?.items ?? []).map((item) => ({
      label: show(item.name),
      value: show(item.id),
    })),
  ];
  const reload = async () => {
    await product.reload();
  };
  const compatibilityFields = (item?: Json) => [
    {
      name: "make",
      label: "Vehicle make",
      required: true,
      defaultValue: item ? show(item.make) : undefined,
    },
    {
      name: "model",
      label: "Model",
      required: true,
      defaultValue: item ? show(item.model) : undefined,
    },
    {
      name: "yearFrom",
      label: "Year from",
      type: "number" as const,
      defaultValue: item?.yearFrom ? Number(item.yearFrom) : undefined,
    },
    {
      name: "yearTo",
      label: "Year to",
      type: "number" as const,
      defaultValue: item?.yearTo ? Number(item.yearTo) : undefined,
    },
    {
      name: "variant",
      label: "Variant",
      defaultValue: item?.variant ? show(item.variant) : undefined,
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea" as const,
      defaultValue: item?.notes ? show(item.notes) : undefined,
    },
  ];
  const compatibilityPayload = (v: Record<string, string>) => ({
    make: v.make,
    model: v.model,
    yearFrom: optionalNumber(v.yearFrom),
    yearTo: optionalNumber(v.yearTo),
    variant: v.variant || null,
    notes: v.notes || null,
  });

  return (
    <>
      <Link
        href="/catalogue?view=products"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to products
      </Link>
      <PageHeader
        eyebrow="CATALOGUE PRODUCT"
        title={show(row.name)}
        description={`${show(row.catalogueCode)} · ${show(row.category?.name)}${row.brand?.name ? ` · ${show(row.brand.name)}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Status value={row.isActive ? "ACTIVE" : "INACTIVE"} />
            <FormDialog
              title="Edit product"
              trigger={<Button variant="secondary">Edit product</Button>}
            >
              <ActionForm
                endpoint={`/admin/catalogue/products/${id}`}
                method="PATCH"
                submit="Save product"
                fields={[
                  {
                    name: "name",
                    label: "Product name",
                    required: true,
                    defaultValue: show(row.name),
                  },
                  {
                    name: "catalogueCode",
                    label: "Catalogue code",
                    defaultValue: row.catalogueCode
                      ? show(row.catalogueCode)
                      : "",
                  },
                  {
                    name: "description",
                    label: "Description",
                    type: "textarea",
                    defaultValue: row.description ? show(row.description) : "",
                  },
                  {
                    name: "imagePath",
                    label: "Product image path (/assets/...)",
                    defaultValue: row.imagePath ? show(row.imagePath) : "",
                  },
                  {
                    name: "categoryId",
                    label: "Category",
                    type: "select",
                    options: categoryOptions,
                    defaultValue: show(row.categoryId),
                    required: true,
                  },
                  {
                    name: "brandId",
                    label: "Brand",
                    type: "select",
                    options: brandOptions,
                    defaultValue: row.brandId ? show(row.brandId) : "",
                  },
                  {
                    name: "isActive",
                    label: "Status",
                    type: "select",
                    defaultValue: row.isActive ? "true" : "false",
                    options: [
                      { label: "Active", value: "true" },
                      { label: "Inactive", value: "false" },
                    ],
                  },
                ]}
                transform={(v) => ({
                  name: v.name,
                  catalogueCode: v.catalogueCode || null,
                  description: v.description || null,
                  imagePath: v.imagePath || null,
                  categoryId: v.categoryId,
                  brandId: v.brandId || null,
                  isActive: v.isActive === "true",
                })}
                onDone={reload}
              />
            </FormDialog>
          </div>
        }
      />

      <div className="grid gap-5">
        <SectionCard
          title="Product information"
          description="Shared reference information shown across the platform."
        >
          <DetailGrid
            items={[
              { label: "Category", value: show(row.category?.name) },
              { label: "Brand", value: show(row.brand?.name) },
              { label: "Catalogue code", value: show(row.catalogueCode) },
              { label: "Description", value: show(row.description) },
            ]}
          />
        </SectionCard>

        <SectionCard
          title="Part numbers"
          description="One number is always the primary reference."
          action={
            <FormDialog
              title="Add part number"
              trigger={<Button>Add part number</Button>}
            >
              <ActionForm
                endpoint={`/admin/catalogue/products/${id}/numbers`}
                submit="Add part number"
                fields={[
                  { name: "partNumber", label: "Part number", required: true },
                  { name: "manufacturer", label: "Manufacturer" },
                  { name: "notes", label: "Notes", type: "textarea" },
                ]}
                transform={(v) => ({
                  partNumber: v.partNumber,
                  isPrimary: false,
                  manufacturer: v.manufacturer || null,
                  notes: v.notes || null,
                })}
                onDone={reload}
              />
            </FormDialog>
          }
        >
          {!numbers.length ? (
            <FriendlyEmpty
              title="No part numbers"
              detail="Add the primary product reference."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {numbers.map((number) => (
                <div
                  key={show(number.id)}
                  className="flex items-start justify-between gap-3 rounded-xl border p-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{show(number.partNumber)}</b>
                      {number.isPrimary && <Status value="PRIMARY" />}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {show(number.manufacturer)}
                    </p>
                    {number.notes && (
                      <p className="mt-2 text-sm">{show(number.notes)}</p>
                    )}
                  </div>
                  <MoreActions>
                    <FormDialog
                      title={`Edit ${show(number.partNumber)}`}
                      trigger={
                        <Button size="sm" variant="secondary">
                          Edit
                        </Button>
                      }
                    >
                      <ActionForm
                        endpoint={`/admin/catalogue/products/${id}/numbers/${show(number.id)}`}
                        method="PATCH"
                        submit="Save part number"
                        fields={[
                          {
                            name: "partNumber",
                            label: "Part number",
                            required: true,
                            defaultValue: show(number.partNumber),
                          },
                          {
                            name: "manufacturer",
                            label: "Manufacturer",
                            defaultValue: number.manufacturer
                              ? show(number.manufacturer)
                              : "",
                          },
                          {
                            name: "notes",
                            label: "Notes",
                            type: "textarea",
                            defaultValue: number.notes
                              ? show(number.notes)
                              : "",
                          },
                          {
                            name: "isPrimary",
                            label: "Primary reference",
                            type: "select",
                            defaultValue: number.isPrimary ? "true" : "false",
                            options: [
                              { label: "No", value: "false" },
                              { label: "Yes", value: "true" },
                            ],
                          },
                        ]}
                        transform={(v) => ({
                          partNumber: v.partNumber,
                          manufacturer: v.manufacturer || null,
                          notes: v.notes || null,
                          isPrimary: v.isPrimary === "true",
                        })}
                        onDone={reload}
                      />
                    </FormDialog>
                    {!number.isPrimary && (
                      <ActionForm
                        endpoint={`/admin/catalogue/products/${id}/numbers/${show(number.id)}`}
                        method="DELETE"
                        submit="Remove part number"
                        confirm={`Remove ${show(number.partNumber)}?`}
                        fields={[]}
                        onDone={reload}
                      />
                    )}
                  </MoreActions>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Vehicle compatibility"
          description="Reference fitment information; not a guaranteed fit claim."
          action={
            <FormDialog
              title="Add vehicle compatibility"
              trigger={<Button>Add compatibility</Button>}
            >
              <ActionForm
                endpoint={`/admin/catalogue/products/${id}/compatibilities`}
                submit="Add compatibility"
                fields={compatibilityFields()}
                transform={compatibilityPayload}
                onDone={reload}
              />
            </FormDialog>
          }
        >
          {!compatibility.length ? (
            <FriendlyEmpty
              title="No compatibility records"
              detail="Add a make and model when fitment information is available."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {compatibility.map((item) => (
                <div
                  key={show(item.id)}
                  className="flex items-start justify-between gap-3 rounded-xl border p-4"
                >
                  <div>
                    <b>
                      {show(item.make)} {show(item.model)}
                    </b>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.yearFrom || item.yearTo
                        ? `${show(item.yearFrom)}–${show(item.yearTo)}`
                        : "All years"}
                      {item.variant ? ` · ${show(item.variant)}` : ""}
                    </p>
                    {item.notes && (
                      <p className="mt-2 text-sm">{show(item.notes)}</p>
                    )}
                  </div>
                  <MoreActions>
                    <FormDialog
                      title={`Edit ${show(item.make)} ${show(item.model)}`}
                      trigger={
                        <Button size="sm" variant="secondary">
                          Edit
                        </Button>
                      }
                    >
                      <ActionForm
                        endpoint={`/admin/catalogue/products/${id}/compatibilities/${show(item.id)}`}
                        method="PATCH"
                        submit="Save compatibility"
                        fields={compatibilityFields(item)}
                        transform={compatibilityPayload}
                        onDone={reload}
                      />
                    </FormDialog>
                    <ActionForm
                      endpoint={`/admin/catalogue/products/${id}/compatibilities/${show(item.id)}`}
                      method="DELETE"
                      submit="Remove compatibility"
                      confirm={`Remove compatibility for ${show(item.make)} ${show(item.model)}?`}
                      fields={[]}
                      onDone={reload}
                    />
                  </MoreActions>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
