import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

import RoleGuard from './components/RoleGuard';

// Admin pages
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPortfolio from './pages/admin/AdminPortfolio';
import AdminTeam from './pages/admin/AdminTeam';
import AdminFAQs from './pages/admin/AdminFAQs';
import AdminProcess from './pages/admin/AdminProcess';
import AdminInvestment from './pages/admin/AdminInvestment';
import AdminSettings from './pages/admin/AdminSettings';
import AdminTestimonials from './pages/admin/AdminTestimonials';
import AdminInquiries from './pages/admin/AdminInquiries';

// Auth
import Login from './pages/Login';

// Public pages
import Home from './pages/Home';
import About from './pages/About';
import Process from './pages/Process';
import Portfolio from './pages/Portfolio';
import FAQ from './pages/FAQ';
import Investment from './pages/Investment';
import Contact from './pages/Contact';

// Layouts
import PublicLayout from './components/shared/PublicLayout';
import PortalLayout from './components/portal/PortalLayout';

// Portal pages
import Dashboard from './pages/portal/Dashboard';
import MyProject from './pages/portal/MyProject';
import Documents from './pages/portal/Documents';
import Selections from './pages/portal/Selections';
import Messages from './pages/portal/Messages';
import Billing from './pages/portal/Billing';
import Help from './pages/portal/Help';

// Client portal is also served on its own subdomain (portal.dreamhome.design), from the
// same bundle as the marketing site. On that hostname, "/" should lead into the portal
// experience rather than the marketing home page: an authenticated client goes straight
// to the dashboard, and anyone else (anonymous, or staff) goes to the login screen (which
// itself routes staff to /admin and clients to /portal on success — see Login.jsx).
// NOTE: this used to be base44-hosted-redirect based and could loop ("/" -> "/portal" ->
// RoleGuard's redirectTo="/" -> "/portal" ...). Now that login is a real client-side route
// (/login, no server redirect), that loop risk is gone — /login always resolves and never
// redirects itself, so this can safely fire for unauthenticated visitors too.
const PORTAL_HOSTNAME = 'portal.dreamhome.design';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();

  const isPortalHost = typeof window !== 'undefined' && window.location.hostname === PORTAL_HOSTNAME;
  const shouldRedirectRootToPortal = isPortalHost && isAuthenticated && user?.role === 'client';
  const shouldRedirectRootToLogin = isPortalHost && !isAuthenticated;

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-body text-muted-foreground text-sm tracking-wider">DREAM HOME DESIGN</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public website */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={
          shouldRedirectRootToPortal ? <Navigate to="/portal" replace /> :
          shouldRedirectRootToLogin ? <Navigate to="/login" replace /> :
          <Home />
        } />
        <Route path="/about" element={<About />} />
        <Route path="/process" element={<Process />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/investment" element={<Investment />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Client portal — clients only */}
      <Route element={
        <RoleGuard allowedRoles={['client']} redirectTo="/">
          <PortalLayout />
        </RoleGuard>
      }>
        <Route path="/portal" element={<Dashboard />} />
        <Route path="/portal/project" element={<MyProject />} />
        <Route path="/portal/documents" element={<Documents />} />
        <Route path="/portal/selections" element={<Selections />} />
        <Route path="/portal/messages" element={<Messages />} />
        <Route path="/portal/billing" element={<Billing />} />
        <Route path="/portal/help" element={<Help />} />
      </Route>

      {/* Admin portal — manager / admin / super_admin */}
      <Route element={
        <RoleGuard allowedRoles={['manager', 'admin', 'super_admin']} redirectTo="/">
          <AdminLayout />
        </RoleGuard>
      }>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/portfolio" element={<AdminPortfolio />} />
        <Route path="/admin/team" element={<AdminTeam />} />
        <Route path="/admin/faqs" element={<AdminFAQs />} />
        <Route path="/admin/process" element={<AdminProcess />} />
        <Route path="/admin/investment" element={<AdminInvestment />} />
        {/* Settings restricted to admin + super_admin only */}
        <Route path="/admin/settings" element={
          <RoleGuard allowedRoles={['admin', 'super_admin']} redirectTo="/admin">
            <AdminSettings />
          </RoleGuard>
        } />
        <Route path="/admin/testimonials" element={<AdminTestimonials />} />
        <Route path="/admin/inquiries" element={<AdminInquiries />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <AuthenticatedApp />
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
