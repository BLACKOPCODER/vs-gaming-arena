import { redirect } from 'next/navigation';
import AdminDashboard from './dashboard';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect('/admin/login');
  return <AdminDashboard />;
}
