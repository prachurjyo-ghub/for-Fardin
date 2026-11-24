"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { Button, Empty, Skeleton, Status } from "./ui";
import type { Json, Page } from "@/lib/admin";
import { text, value } from "@/lib/admin";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="mb-2 text-[11px] font-black tracking-[.16em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
export function ErrorBox({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="panel flex items-start gap-3 border-danger p-4 text-sm text-danger"
    >
      <AlertCircle className="shrink-0" size={19} />
      <div className="flex-1">
        <b>Could not load this view</b>
        <p>{message}</p>
      </div>
      {retry && (
        <Button size="sm" variant="secondary" onClick={retry}>
          <RefreshCw size={14} />
          Retry
        </Button>
      )}
    </div>
  );
}
type Column = {
  label: string;
  keys: string[];
  render?: (row: Json) => React.ReactNode;
};
export function DataTable({
  page,
  columns,
  href,
  loading,
}: {
  page: Page | null;
  columns: Column[];
  href?: (row: Json) => string;
  loading?: boolean;
}) {
  if (loading)
    return (
      <div className="panel grid gap-3 p-5">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} />
        ))}
      </div>
    );
  if (!page?.items?.length)
    return (
      <div className="panel">
        <Empty />
      </div>
    );
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-muted/70 text-[11px] uppercase tracking-[.1em] text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.label} className="border-b px-5 py-3">
                  {column.label}
                </th>
              ))}
              {href && (
                <th className="border-b px-5 py-3">
                  <span className="sr-only">Open</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {page.items.map((row, index) => (
              <tr
                key={text(value(row, "id", "requestId", "orderId")) + index}
                className="border-b last:border-0 hover:bg-muted/30"
              >
                {columns.map((column) => (
                  <td
                    key={column.label}
                    className="max-w-[340px] px-5 py-4 align-top"
                  >
                    {column.render
                      ? column.render(row)
                      : text(value(row, ...column.keys))}
                  </td>
                ))}
                {href && (
                  <td className="px-5 py-4 text-right">
                    <Link
                      className="inline-flex items-center gap-1 font-bold hover:underline"
                      href={href(row)}
                    >
                      Open <ArrowRight size={14} />
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between border-t px-5 py-3 text-xs text-muted-foreground">
        <span>{page.items.length} shown</span>
        <span>{page.total} total</span>
      </div>
    </div>
  );
}
export const StatusCell = ({
  row,
  keys = ["status"],
}: {
  row: Json;
  keys?: string[];
}) => <Status value={text(value(row, ...keys))} />;
