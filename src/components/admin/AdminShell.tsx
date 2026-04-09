import { Outlet } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminShell() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}