"use client";

import { useCallback, useEffect, useState } from "react";
import { message } from "./api";
import { get } from "./admin";

export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(Boolean(path));
  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError("");
    try {
      setData(await get<T>(path));
    } catch (cause) {
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}
