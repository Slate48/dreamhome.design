import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { useIdleLogout } from '@/lib/useIdleLogout';

import RoleGuard from './components/RoleGuard';
import CapabilityGuard from './components/CapabilityGuard';

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
import AdminUsers from './pages/admin/AdminUsers';
import AdminAccount from './pages/admin/AdminAccount';

// Auth
import Login from './pages/Login';
import InviteAccept from './pages/InviteAccept';

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
// same bundle as the marketing site. On that hostname, "/" is a portal entry point rather
// than the marketing home page: an authenticated user goes straight to their dashboard
// (clients -> /portal, staff -> /admin) and anonymous visitors go to /login. /login itself
// mirrors this — an already-authenticated visitor is forwarded to their dashboard — so a
// logged-in user never sees the marketing home or a login form on the portal host.
// NOTE: /login is a real client-side route that never redirects itself, so the old base44
// redirect loop ("/" -> "/portal" -> RoleGuard's redirectTo="/" -> "/portal" ...) can't recur.
const PORTAL_HOSTNAME = 'portal.dreamhome.design';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();

  // Idle auto-logout for non-persistent ("remember me" unchecked) sessions.
  useIdleLogout();

  const isPortalHost = typeof window !== 'undefined' && window.location.hostname === PORTAL_HOSTNAME;
  // On the portal host, "/" is a portal entry point, never the marketing home:
  // signed-in users go straight to their dashboard (clients -> /portal, staff -> /admin),
  // and everyone else lands on the login screen.
  const portalRootRedirect = !isPortalHost
    ? null
    : !isAuthenticated
    ? '/login'
    : user?.role === 'client'
    ? '/portal'
    : '/admin';

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
          portalRootRedirect ? <Navigate to={portalRootRedirect} replace /> : <Home />
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
      <Route path="/invite/:token" element={<InviteAccept />} />

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

      {/* Admin portal — staff, gated per-section by capability */}
      <Route element={
        <RoleGuard allowedRoles={['staff']} redirectTo="/">
          <AdminLayout />
        </RoleGuard>
      }>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/portfolio" element={<CapabilityGuard capability="portfolio"><AdminPortfolio /></CapabilityGuard>} />
        <Route path="/admin/team" element={<CapabilityGuard capability="team"><AdminTeam /></CapabilityGuard>} />
        <Route path="/admin/faqs" element={<CapabilityGuard capability="faqs"><AdminFAQs /></CapabilityGuard>} />
        <Route path="/admin/process" element={<CapabilityGuard capability="process"><AdminProcess /></CapabilityGuard>} />
        <Route path="/admin/investment" element={<CapabilityGuard capability="investment"><AdminInvestment /></CapabilityGuard>} />
        <Route path="/admin/testimonials" element={<CapabilityGuard capability="testimonials"><AdminTestimonials /></CapabilityGuard>} />
        <Route path="/admin/inquiries" element={<CapabilityGuard capability="inquiries"><AdminInquiries /></CapabilityGuard>} />
        <Route path="/admin/settings" element={<CapabilityGuard capability="settings"><AdminSettings /></CapabilityGuard>} />
        <Route path="/admin/users" element={<CapabilityGuard capability="users"><AdminUsers /></CapabilityGuard>} />
        <Route path="/admin/account" element={<AdminAccount />} />
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
