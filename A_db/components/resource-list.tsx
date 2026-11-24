"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DataTable, ErrorBox, PageHeader } from "./page";
import { SearchField } from "./search-field";
import { Button } from "./ui";
import { query, type Json, type Page } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";

type Column = {
  label: string;
  keys: string[];
  render?: (row: Json) => React.ReactNode;
};
type Filter = {
  name: string;
  label: string;
  options: Array<{ label: string; value: string }>;
};

export function ResourceList({
  title,
  eyebrow,
  description,
  endpoint,
  columns,
  detailBase,
  detailKey = "id",
  search,
  filters = [],
  defaults = {},
  action,
}: {
  title: string;
  eyebrow: string;
  description: string;
  endpoint: string;
  columns: Column[];
  detailBase?: string;
  detailKey?: string;
  search?: boolean;
  filters?: Filter[];
  defaults?: Record<string, string>;
  action?: React.ReactNode;
}) {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const current = { ...defaults, ...Object.fromEntries(params.entries()) };
  const page = Number(current.page || 1);
  const path = `${endpoint}${query({ ...current, page, pageSize: 20 })}`;
  const resource = useResource<Page>(path);
  function set(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}`);
  }
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={action}
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        {search && (
          <form
            className="w-full max-w-sm"
            onSubmit={(event) => {
              event.preventDefault();
              set(
                "search",
                String(new FormData(event.currentTarget).get("search")),
              );
            }}
          >
            <SearchField
              label={`Search ${title}`}
              name="search"
              defaultValue={current.search}
              placeholder={`Search ${title.toLowerCase()}`}
            />
          </form>
        )}
        {filters.map((filter) => (
          <label key={filter.name} className="label min-w-48">
            {filter.label}
            <select
              className="field"
              value={current[filter.name] || ""}
              onChange={(event) => set(filter.name, event.target.value)}
            >
              <option value="">All</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {resource.error && (
        <ErrorBox
          message={resource.error}
          retry={() => void resource.reload()}
        />
      )}
      <DataTable
        page={resource.data}
        loading={resource.loading}
        columns={columns}
        href={
          detailBase
            ? (row) => `${detailBase}/${String(row[detailKey])}`
            : undefined
        }
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="secondary"
          disabled={page <= 1 || resource.loading}
          onClick={() => set("page", String(page - 1))}
        >
          <ChevronLeft size={15} />
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={
            !resource.data ||
            page * resource.data.pageSize >= resource.data.total ||
            resource.loading
          }
          onClick={() => set("page", String(page + 1))}
        >
          Next
          <ChevronRight size={15} />
        </Button>
      </div>
    </>
  );
}
