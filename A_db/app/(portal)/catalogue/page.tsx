"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import {
  FormDialog,
  FriendlyEmpty,
  SectionCard,
  ViewTabs,
} from "@/components/management";
import { DataTable, ErrorBox, PageHeader, StatusCell } from "@/components/page";
import { SearchField } from "@/components/search-field";
import { Button, Status } from "@/components/ui";
import { type Json, type Page, text } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";
import { formatDhaka } from "@/lib/utils";

type View = "products" | "categories" | "brands" | "listings";
const show = (value: unknown) =>
  value == null || value === "" ? "—" : String(value);
const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function ProductForm({
  categories,
  brands,
  reload,
}: {
  categories: Json[];
  brands: Json[];
  reload: () => Promise<unknown>;
}) {
  return (
    <ActionForm
      endpoint="/admin/catalogue/products"
      submit="Create product"
      fields={[
        { name: "name", label: "Product name", required: true },
        { name: "catalogueCode", label: "Catalogue code (optional)" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "imagePath", label: "Product image path (/assets/...)" },
        {
          name: "categoryId",
          label: "Category",
          type: "select",
          required: true,
          options: categories.map((item) => ({
            label: show(item.name),
            value: show(item.id),
          })),
        },
        {
          name: "brandId",
          label: "Brand",
          type: "select",
          options: [
            { label: "No brand", value: "" },
            ...brands.map((item) => ({
              label: show(item.name),
              value: show(item.id),
            })),
          ],
        },
        { name: "partNumber", label: "Primary part number", required: true },
      ]}
      transform={(v) => ({
        name: v.name,
        catalogueCode: v.catalogueCode || null,
        description: v.description || null,
        imagePath: v.imagePath || null,
        categoryId: v.categoryId,
        brandId: v.brandId || null,
        isActive: true,
        numbers: [{ partNumber: v.partNumber, isPrimary: true }],
        compatibility: [],
      })}
      onDone={reload}
    />
  );
}

export default function CataloguePage() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = ["products", "categories", "brands", "listings"].includes(
    params.get("view") || "",
  )
    ? (params.get("view") as View)
    : "products";
  const [view, setView] = useState<View>(initial);
  const [search, setSearch] = useState("");
  const products = useResource<Page>(
    "/admin/catalogue/products?page=1&pageSize=100",
  );
  const categories = useResource<Page>(
    "/admin/catalogue/categories?page=1&pageSize=100",
  );
  const brands = useResource<Page>(
    "/admin/catalogue/brands?page=1&pageSize=100",
  );
  const requests = useResource<Page>(
    "/admin/catalogue/category-requests?page=1&pageSize=100&status=PENDING",
  );
  const listings = useResource<Page>("/admin/listings?page=1&pageSize=100");
  const reload = async () => {
    await Promise.all([
      products.reload(),
      categories.reload(),
      brands.reload(),
      requests.reload(),
      listings.reload(),
    ]);
  };
  const activeCategories = (categories.data?.items ?? []).filter(
    (row) => row.isActive,
  );
  const activeBrands = (brands.data?.items ?? []).filter((row) => row.isActive);
  const categoryOptions = [
    { label: "Root category", value: "" },
    ...activeCategories.map((item) => ({
      label: show(item.name),
      value: show(item.id),
    })),
  ];
  const filtered = (page: Page | null, fields: (row: Json) => string) => {
    const needle = search.trim().toLowerCase();
    return !needle || !page
      ? page
      : {
          ...page,
          items: page.items.filter((row) =>
            fields(row).toLowerCase().includes(needle),
          ),
        };
  };
  const visibleProducts = filtered(
    products.data,
    (row) =>
      `${show(row.name)} ${show(row.catalogueCode)} ${show(row.category?.name)} ${show(row.brand?.name)} ${(row.numbers ?? []).map((item: Json) => item.partNumber).join(" ")}`,
  );
  const visibleCategories = filtered(
    categories.data,
    (row) => `${show(row.name)} ${show(row.parent?.name)}`,
  );
  const visibleBrands = filtered(brands.data, (row) => show(row.name));
  const visibleListings = filtered(
    listings.data,
    (row) =>
      `${show(row.product?.name)} ${show(row.sku)} ${show(row.business?.displayName)} ${show(row.listingClassification)}`,
  );
  const setCurrentView = (next: View) => {
    setView(next);
    router.replace(`/catalogue?view=${next}`);
  };
  const error =
    products.error ||
    categories.error ||
    brands.error ||
    requests.error ||
    listings.error;

  const primaryAction =
    view === "products" ? (
      <FormDialog
        title="Add catalogue product"
        trigger={<Button>Add product</Button>}
      >
        <ProductForm
          categories={activeCategories}
          brands={activeBrands}
          reload={reload}
        />
      </FormDialog>
    ) : view === "categories" ? (
      <FormDialog title="Add category" trigger={<Button>Add category</Button>}>
        <ActionForm
          endpoint="/admin/catalogue/categories"
          submit="Create category"
          fields={[
            { name: "name", label: "Category name", required: true },
            { name: "description", label: "Description", type: "textarea" },
            { name: "imagePath", label: "Category image path (/assets/...)" },
            {
              name: "parentId",
              label: "Parent category",
              type: "select",
              options: categoryOptions,
            },
          ]}
          transform={(v) => ({
            name: v.name,
            slug: slugify(v.name),
            description: v.description || null,
            imagePath: v.imagePath || null,
            parentId: v.parentId || null,
            isActive: true,
          })}
          onDone={reload}
        />
      </FormDialog>
    ) : view === "brands" ? (
      <FormDialog title="Add brand" trigger={<Button>Add brand</Button>}>
        <ActionForm
          endpoint="/admin/catalogue/brands"
          submit="Create brand"
          fields={[{ name: "name", label: "Brand name", required: true }]}
          transform={(v) => ({
            name: v.name,
            slug: slugify(v.name),
            isActive: true,
          })}
          onDone={reload}
        />
      </FormDialog>
    ) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="REFERENCE DATA"
        title="Global catalogue"
        description="Manage shared products and reference data separately from supplier stock and pricing."
        action={primaryAction}
      />
      <ViewTabs
        value={view}
        onChange={setCurrentView}
        items={[
          { value: "products", label: "Products", count: products.data?.total },
          {
            value: "categories",
            label: "Categories",
            count: categories.data?.total,
          },
          { value: "brands", label: "Brands", count: brands.data?.total },
          {
            value: "listings",
            label: "Supplier listings",
            count: listings.data?.total,
          },
        ]}
      />
      {error && <ErrorBox message={error} retry={() => void reload()} />}
      <SearchField
        containerClassName="mb-4 max-w-sm"
        label={`Search ${view}`}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={`Search ${view}`}
      />

      {view === "products" && (
        <SectionCard
          title="Products"
          description="Open a product to manage its information, part numbers, and vehicle compatibility."
        >
          <DataTable
            page={visibleProducts}
            loading={products.loading}
            href={(row) => `/catalogue/products/${show(row.id)}`}
            columns={[
              {
                label: "Product",
                keys: ["name"],
                render: (row) => (
                  <div>
                    <b>{text(row.name)}</b>
                    <p className="text-xs text-muted-foreground">
                      {text(row.catalogueCode)}
                    </p>
                  </div>
                ),
              },
              {
                label: "Category",
                keys: ["category"],
                render: (row) => text(row.category?.name),
              },
              {
                label: "Brand",
                keys: ["brand"],
                render: (row) => text(row.brand?.name),
              },
              {
                label: "Primary part number",
                keys: ["numbers"],
                render: (row) =>
                  text(
                    (row.numbers ?? []).find((item: Json) => item.isPrimary)
                      ?.partNumber,
                  ),
              },
              {
                label: "Status",
                keys: ["isActive"],
                render: (row) => (
                  <StatusCell
                    row={{ status: row.isActive ? "ACTIVE" : "INACTIVE" }}
                  />
                ),
              },
            ]}
          />
        </SectionCard>
      )}

      {view === "categories" && (
        <div className="grid gap-5">
          <SectionCard
            title="Categories"
            description="Maintain a readable hierarchy. URL slugs are generated automatically from names."
          >
            <DataTable
              page={visibleCategories}
              loading={categories.loading}
              columns={[
                {
                  label: "Category",
                  keys: ["name"],
                  render: (row) => (
                    <div>
                      <b>{text(row.name)}</b>
                      <p className="text-xs text-muted-foreground">
                        {row.parent?.name
                          ? `Under ${text(row.parent.name)}`
                          : "Root category"}
                      </p>
                    </div>
                  ),
                },
                {
                  label: "Status",
                  keys: ["isActive"],
                  render: (row) => (
                    <Status value={row.isActive ? "ACTIVE" : "INACTIVE"} />
                  ),
                },
                {
                  label: "Actions",
                  keys: ["id"],
                  render: (row) => (
                    <FormDialog
                      title={`Edit ${show(row.name)}`}
                      trigger={
                        <Button size="sm" variant="secondary">
                          Edit
                        </Button>
                      }
                    >
                      <ActionForm
                        endpoint={`/admin/catalogue/categories/${show(row.id)}`}
                        method="PATCH"
                        submit="Save category"
                        fields={[
                          {
                            name: "name",
                            label: "Category name",
                            required: true,
                            defaultValue: show(row.name),
                          },
                          {
                            name: "description",
                            label: "Description",
                            type: "textarea",
                            defaultValue: row.description
                              ? show(row.description)
                              : "",
                          },
                          {
                            name: "imagePath",
                            label: "Category image path (/assets/...)",
                            defaultValue: row.imagePath
                              ? show(row.imagePath)
                              : "",
                          },
                          {
                            name: "parentId",
                            label: "Parent category",
                            type: "select",
                            defaultValue: row.parentId
                              ? show(row.parentId)
                              : "",
                            options: categoryOptions.filter(
                              (option) => option.value !== show(row.id),
                            ),
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
                          slug: slugify(v.name),
                          description: v.description || null,
                          imagePath: v.imagePath || null,
                          parentId: v.parentId || null,
                          isActive: v.isActive === "true",
                        })}
                        onDone={reload}
                      />
                    </FormDialog>
                  ),
                },
              ]}
            />
          </SectionCard>
          <SectionCard
            title={`Pending supplier requests (${requests.data?.total ?? 0})`}
            description="Review requested catalogue coverage here instead of in a separate catalogue area."
          >
            {!requests.data?.items.length ? (
              <FriendlyEmpty
                title="No requests waiting"
                detail="New supplier category requests will appear in this queue."
              />
            ) : (
              <div className="grid gap-3">
                {requests.data.items.map((request) => (
                  <div key={show(request.id)} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <b>{show(request.proposedName)}</b>
                          <Status value="PENDING" />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Requested by {show(request.business?.displayName)} ·{" "}
                          {formatDhaka(request.createdAt)}
                        </p>
                        <p className="mt-3 text-sm">
                          {show(request.justification)}
                        </p>
                      </div>
                      <FormDialog
                        title={`Review ${show(request.proposedName)}`}
                        trigger={<Button size="sm">Review</Button>}
                      >
                        <div className="mb-4 rounded-xl bg-muted/50 p-4 text-sm">
                          <b>{show(request.proposedName)}</b>
                          <p className="mt-1 text-muted-foreground">
                            {show(request.description)}
                          </p>
                          <p className="mt-2">
                            Supplier: {show(request.business?.displayName)}
                          </p>
                        </div>
                        <ActionForm
                          endpoint={`/admin/catalogue/category-requests/${show(request.id)}/decision`}
                          submit="Record final decision"
                          confirm="Record this final category-request decision?"
                          fields={[
                            {
                              name: "decision",
                              label: "Decision",
                              type: "select",
                              options: [
                                {
                                  label: "Approve and create category",
                                  value: "APPROVE_CREATE",
                                },
                                {
                                  label: "Approve using an existing category",
                                  value: "APPROVE_EXISTING",
                                },
                                { label: "Reject request", value: "REJECT" },
                              ],
                            },
                            {
                              name: "existingCategoryId",
                              label: "Existing category (used when matching)",
                              type: "select",
                              options: [
                                { label: "Select a category", value: "" },
                                ...activeCategories.map((item) => ({
                                  label: show(item.name),
                                  value: show(item.id),
                                })),
                              ],
                            },
                            {
                              name: "reason",
                              label: "Decision reason",
                              type: "textarea",
                              required: true,
                            },
                          ]}
                          validate={(v) =>
                            v.decision === "APPROVE_EXISTING" &&
                            !v.existingCategoryId
                              ? "Select the existing category."
                              : null
                          }
                          transform={(v) => ({
                            decision: v.decision,
                            ...(v.decision === "APPROVE_CREATE"
                              ? { slug: slugify(show(request.proposedName)) }
                              : {}),
                            ...(v.decision === "APPROVE_EXISTING"
                              ? { existingCategoryId: v.existingCategoryId }
                              : {}),
                            reason: v.reason,
                          })}
                          onDone={reload}
                        />
                      </FormDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {view === "listings" && (
        <SectionCard
          title="Supplier listings"
          description="Inspect supplier-specific classification, publication, moderation, stock, advertised price, and one-unit commission eligibility."
        >
          <DataTable
            page={visibleListings}
            loading={listings.loading}
            columns={[
              {
                label: "Listing",
                keys: ["product"],
                render: (row) => {
                  const images = Array.isArray(row.images) ? row.images : [];
                  const primary =
                    images.find(
                      (image) =>
                        image &&
                        typeof image === "object" &&
                        "isPrimary" in image &&
                        image.isPrimary,
                    ) ?? images[0];
                  const imageUrl =
                    primary && typeof primary === "object" && "url" in primary
                      ? String(primary.url)
                      : null;
                  return (
                    <div className="flex items-center gap-3">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt=""
                          width={56}
                          height={56}
                          unoptimized
                          className="size-14 rounded-md object-cover"
                        />
                      ) : null}
                      <div>
                        <b>{text(row.product?.name)}</b>
                        <p className="text-xs text-muted-foreground">
                          {text(row.sku)} · {text(row.business?.displayName)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {images.length} image{images.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  );
                },
              },
              {
                label: "Classification",
                keys: ["listingClassification"],
                render: (row) => (
                  <Status value={text(row.listingClassification)} />
                ),
              },
              {
                label: "Price / stock",
                keys: ["unitPrice"],
                render: (row) => (
                  <div>
                    <b>BDT {text(row.unitPrice)}</b>
                    <p className="text-xs text-muted-foreground">
                      {text(row.availableQuantity)} available
                    </p>
                  </div>
                ),
              },
              {
                label: "Publication",
                keys: ["publicationStatus"],
                render: (row) => <Status value={text(row.publicationStatus)} />,
              },
              {
                label: "Commission eligibility",
                keys: ["commissionEligibility"],
                render: (row) => (
                  <div>
                    <Status
                      value={
                        row.commissionEligibility?.eligible
                          ? "ELIGIBLE"
                          : "AWAITING CREDITS"
                      }
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.commissionEligibility?.requiredCredit
                        ? `Needs BDT ${text(row.commissionEligibility.requiredCredit)} / unit`
                        : text(row.commissionEligibility?.reason)}
                    </p>
                  </div>
                ),
              },
              {
                label: "Moderation",
                keys: ["moderationStatus"],
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <Status value={text(row.moderationStatus)} />
                    <FormDialog
                      title={`Moderate ${text(row.product?.name)}`}
                      trigger={
                        <Button size="sm" variant="secondary">
                          Review
                        </Button>
                      }
                    >
                      <ActionForm
                        endpoint={`/admin/listings/${show(row.id)}/moderation`}
                        submit="Record moderation"
                        confirm="Record this audited listing moderation decision?"
                        fields={[
                          {
                            name: "status",
                            label: "Decision",
                            type: "select",
                            options: [
                              { label: "Approve", value: "APPROVED" },
                              { label: "Flag for review", value: "FLAGGED" },
                              {
                                label: "Reject and suspend",
                                value: "REJECTED",
                              },
                            ],
                          },
                          {
                            name: "reason",
                            label: "Moderation reason",
                            type: "textarea",
                            required: true,
                          },
                        ]}
                        onDone={reload}
                      />
                    </FormDialog>
                  </div>
                ),
              },
            ]}
          />
        </SectionCard>
      )}

      {view === "brands" && (
        <SectionCard
          title="Brands"
          description="Use brands as lightweight product reference data."
        >
          <DataTable
            page={visibleBrands}
            loading={brands.loading}
            columns={[
              {
                label: "Brand",
                keys: ["name"],
                render: (row) => <b>{text(row.name)}</b>,
              },
              {
                label: "Status",
                keys: ["isActive"],
                render: (row) => (
                  <Status value={row.isActive ? "ACTIVE" : "INACTIVE"} />
                ),
              },
              {
                label: "Actions",
                keys: ["id"],
                render: (row) => (
                  <FormDialog
                    title={`Edit ${show(row.name)}`}
                    trigger={
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    }
                  >
                    <ActionForm
                      endpoint={`/admin/catalogue/brands/${show(row.id)}`}
                      method="PATCH"
                      submit="Save brand"
                      fields={[
                        {
                          name: "name",
                          label: "Brand name",
                          required: true,
                          defaultValue: show(row.name),
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
                        slug: slugify(v.name),
                        isActive: v.isActive === "true",
                      })}
                      onDone={reload}
                    />
                  </FormDialog>
                ),
              },
            ]}
          />
        </SectionCard>
      )}
    </>
  );
}
