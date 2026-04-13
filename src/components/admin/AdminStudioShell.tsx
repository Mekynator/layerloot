import { Outlet } from "react-router-dom";
import AdminStudioLayout from "@/components/admin/AdminStudioLayout";

export default function AdminStudioShell() {
  return (
    <AdminStudioLayout>
      <Outlet />
    </AdminStudioLayout>
  );
}
