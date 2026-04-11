"use client";

import { useState, useCallback } from "react";
import { Period } from "@/types";

export function usePeriod(defaultPeriod: Period = "WEEKLY") {
  const [period, setPeriod] = useState<Period>(defaultPeriod);

  const changePeriod = useCallback((newPeriod: Period) => {
    setPeriod(newPeriod);
  }, []);

  return { period, setPeriod: changePeriod };
}
