import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ReturnPathState {
  returnPath: string | null;
  setReturnPath: (path: string) => void;
}

export const useReturnPathStore = create<ReturnPathState>()(
  persist(
    (set) => ({
      returnPath: null,
      setReturnPath: (returnPath) => set({ returnPath }),
    }),
    {
      name: "return-path",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
