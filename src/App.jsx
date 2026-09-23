import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import NewTransaction from '@/pages/NewTransaction';
import TransactionDetail from '@/pages/TransactionDetail';
import ProviderStatus from '@/pages/ProviderStatus';
import TransactionLogs from '@/pages/TransactionLogs';
import Analytics from '@/pages/Analytics';
import SettingsPage from '@/pages/Settings';
import ApiKeys from '@/pages/ApiKeys';
import Webhooks from '@/pages/Webhooks';
import CryptoWallets from '@/pages/CryptoWallets';
import Security from '@/pages/Security';
import GestionPrestataires from '@/pages/GestionPrestataires';
import JournalWebhooks from '@/pages/JournalWebhooks';
import ParametresSecurite from '@/pages/ParametresSecurite';
import RapportsPerformance from '@/pages/RapportsPerformance';
import ManageProviders from '@/pages/ManageProviders';
import Wallets from '@/pages/Wallets';
import PaymentHistory from '@/pages/PaymentHistory';
import WebhookConsole from '@/pages/WebhookConsole';
import RateManagement from '@/pages/RateManagement';
import SecuritySettings from '@/pages/SecuritySettings';
import ApiDocs from '@/pages/ApiDocs';
import WebhookAudit from '@/pages/WebhookAudit';
import CurrencyManagement from '@/pages/CurrencyManagement';
import WebhookTester from '@/pages/WebhookTester';
import ConnectionTester from '@/pages/ConnectionTester';
import PaymentLinks from '@/pages/PaymentLinks';
import PayLink from '@/pages/PayLink';
import Pricing from '@/pages/Pricing';
import PayunitReturn from '@/pages/PayunitReturn';
import Onboarding from '@/pages/Onboarding';
import MerchantSettings from '@/pages/MerchantSettings';
import ApprovalPending from '@/pages/ApprovalPending';
import Approvals from '@/pages/Approvals';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminOverview from '@/pages/admin/Overview';
import AdminTenants from '@/pages/admin/Tenants';
import AdminTransactions from '@/pages/admin/Transactions';
import AdminProviders from '@/pages/admin/Providers';
import AdminRates from '@/pages/admin/Rates';
import AdminSystemLogs from '@/pages/admin/SystemLogs';
import AdminSecurity from '@/pages/admin/Security';
import AdminRoles from '@/pages/admin/Roles';
import AdminGitHubReviews from '@/pages/admin/GitHubReviews';
import AdminGateways from '@/pages/admin/Gateways';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const isEmbed = new URLSearchParams(window.location.search).get("embed") === "true";

  // Embedded checkout (iframe on a marketplace) — render only the bare checkout, no auth/sidebar.
  if (isEmbed) {
    return (
      <Routes>
        <Route path="/payments/new" element={<NewTransaction />} />
        <Route path="*" element={<NewTransaction />} />
      </Routes>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pay/:slug" element={<PayLink />} />
      <Route path="/payunit-return" element={<PayunitReturn />} />
      <Route path="/api-docs" element={<ApiDocs />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/approval-pending" element={<ApprovalPending />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/payment-links" element={<PaymentLinks />} />
          <Route path="/payments/new" element={<NewTransaction />} />
          <Route path="/payments/:id" element={<TransactionDetail />} />
          <Route path="/provider-status" element={<ProviderStatus />} />
          <Route path="/transaction-logs" element={<TransactionLogs />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/webhooks" element={<Webhooks />} />
          <Route path="/crypto-wallets" element={<CryptoWallets />} />
          <Route path="/security" element={<Security />} />
          <Route path="/gestion-prestataires" element={<GestionPrestataires />} />
          <Route path="/journal-webhooks" element={<JournalWebhooks />} />
          <Route path="/parametres-securite" element={<ParametresSecurite />} />
          <Route path="/rapports-performance" element={<RapportsPerformance />} />
          <Route path="/manage-providers" element={<ManageProviders />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/payment-history" element={<PaymentHistory />} />
          <Route path="/webhook-console" element={<WebhookConsole />} />
          <Route path="/rate-management" element={<RateManagement />} />
          <Route path="/security-settings" element={<SecuritySettings />} />
          <Route path="/webhook-audit" element={<WebhookAudit />} />
          <Route path="/currency-management" element={<CurrencyManagement />} />
          <Route path="/webhook-tester" element={<WebhookTester />} />
          <Route path="/connection-tester" element={<ConnectionTester />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/merchant-settings" element={<MerchantSettings />} />
        </Route>
        <Route path="/admin/superadmin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="tenants" element={<AdminTenants />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="providers" element={<AdminProviders />} />
          <Route path="rates" element={<AdminRates />} />
          <Route path="roles" element={<AdminRoles />} />
          <Route path="system-logs" element={<AdminSystemLogs />} />
          <Route path="security" element={<AdminSecurity />} />
          <Route path="github" element={<AdminGitHubReviews />} />
          <Route path="gateways" element={<AdminGateways />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App