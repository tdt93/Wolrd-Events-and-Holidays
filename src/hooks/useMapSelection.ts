import { useCallback, useState } from "react";

export interface SelectedCountry {
  code: string;
  name: string;
  centroid: [number, number];
  bbox?: [number, number, number, number];
}

export function useMapSelection() {
  const [selected, setSelected] = useState<SelectedCountry | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const selectCountry = useCallback((country: SelectedCountry | null) => {
    setSelected(country);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(null);
  }, []);

  return {
    selected,
    hoveredCode,
    setHoveredCode,
    selectCountry,
    clearSelection,
  };
}
