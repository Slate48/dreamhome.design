import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-body text-muted-foreground text-sm tracking-wider">DREAM HOME DESIGN</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public website */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/process" element={<Process />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/investment" element={<Investment />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Client portal */}
      <Route element={<PortalLayout />}>
        <Route path="/portal" element={<Dashboard />} />
        <Route path="/portal/project" element={<MyProject />} />
        <Route path="/portal/documents" element={<Documents />} />
        <Route path="/portal/selections" element={<Selections />} />
        <Route path="/portal/messages" element={<Messages />} />
        <Route path="/portal/billing" element={<Billing />} />
        <Route path="/portal/help" element={<Help />} />
      </Route>

      {/* Admin portal */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/portfolio" element={<AdminPortfolio />} />
        <Route path="/admin/team" element={<AdminTeam />} />
        <Route path="/admin/faqs" element={<AdminFAQs />} />
        <Route path="/admin/process" element={<AdminProcess />} />
        <Route path="/admin/investment" element={<AdminInvestment />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/testimonials" element={<AdminTestimonials />} />
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
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App