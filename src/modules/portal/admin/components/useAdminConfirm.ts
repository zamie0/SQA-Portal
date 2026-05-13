import { useContext } from "react";
import { AdminConfirmContext } from "./AdminConfirmContext";

export function useAdminConfirm() {
  const context = useContext(AdminConfirmContext);
  if (!context) {
    return async () => true;
  }
  return context;
}
