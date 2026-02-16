import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ApiKeyProvider } from '@/components/ApiKeyDialog';
import { DashboardPage } from '@/pages/DashboardPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { CustomerDetailPage } from '@/pages/CustomerDetailPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { AlertDetailPage } from '@/pages/AlertDetailPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { DocumentDetailPage } from '@/pages/DocumentDetailPage';
import { CasesPage } from '@/pages/CasesPage';
import { CaseDetailPage } from '@/pages/CaseDetailPage';
import { ReportsPage } from '@/pages/ReportsPage';

function App() {
  return (
    <BrowserRouter>
      <ApiKeyProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/alerts/:alert_id" element={<AlertDetailPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/:documentId" element={<DocumentDetailPage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/cases/:caseId" element={<CaseDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Routes>
      </ApiKeyProvider>
    </BrowserRouter>
  );
}

export default App;
