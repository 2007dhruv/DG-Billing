import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, FileText, ShoppingCart, 
  FileSpreadsheet, Users, BarChart3, Plus, Settings, 
  RefreshCw, Building2, Shield, LogOut, ExternalLink, ArrowLeft,
  Menu, X
} from 'lucide-react';

import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Invoicing } from './components/Invoicing';
import { Purchases } from './components/Purchases';
import { Quotations } from './components/Quotations';
import { Parties } from './components/Parties';
import { Reports } from './components/Reports';
import { InvoiceModal } from './components/InvoiceModal';
import { BusinessSetupModal } from './components/BusinessSetupModal';
import { Login } from './components/Login';
import { BusinessManagement } from './components/BusinessManagement';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vyapar_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'businesses' : 'dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active impersonated/selected business (for Super Admin)
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  const navigateTab = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Verify stored session with backend
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('vyapar_token');
      if (!token) {
        setCurrentUser(null);
        setAuthChecking(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          localStorage.setItem('vyapar_user', JSON.stringify(data.user));
          if (data.business) {
            setProfile(data.business);
          }
          if (data.user.role === 'SUPER_ADMIN' && !localStorage.getItem('vyapar_active_biz_id')) {
            setActiveTab('businesses');
          }
        } else {
          localStorage.removeItem('vyapar_token');
          localStorage.removeItem('vyapar_user');
          localStorage.removeItem('vyapar_active_biz_id');
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setAuthChecking(false);
      }
    };

    verifyAuth();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDashboard();
      fetchProfile();
    }
  }, [currentUser, selectedBusiness]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('vyapar_token');
      localStorage.removeItem('vyapar_user');
      localStorage.removeItem('vyapar_active_biz_id');
      setCurrentUser(null);
      setSelectedBusiness(null);
      setActiveTab('dashboard');
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'SUPER_ADMIN') {
      setActiveTab('businesses');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleSelectBusinessWorkspace = (biz) => {
    setSelectedBusiness(biz);
    localStorage.setItem('vyapar_active_biz_id', biz.id);
    setProfile(biz);
    setActiveTab('dashboard');
  };

  const handleExitBusinessWorkspace = () => {
    setSelectedBusiness(null);
    localStorage.removeItem('vyapar_active_biz_id');
    setActiveTab('businesses');
    fetchDashboard();
  };

  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        color: 'var(--text-muted)'
      }}>
        Verifying secure workspace session...
      </div>
    );
  }

  // If not authenticated, render Login Screen
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const effectiveBusinessName = selectedBusiness?.business_name || profile?.business_name || 'My Business Workspace';

  return (
    <div className="app-layout">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="brand-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="brand-icon">
              <Package size={22} />
            </div>
            <div>
              <div className="brand-title">DG Billing</div>
              <div className="brand-badge">
                {isSuperAdmin ? 'PLATFORM ADMIN' : 'BUSINESS WORKSPACE'}
              </div>
            </div>
          </div>
          <button 
            className="sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="nav-menu">
          {/* Super Admin Client Businesses Portal */}
          {isSuperAdmin && (
            <button 
              className={`nav-item ${activeTab === 'businesses' ? 'active' : ''}`}
              onClick={() => {
                localStorage.removeItem('vyapar_active_biz_id');
                setSelectedBusiness(null);
                navigateTab('businesses');
              }}
              style={{
                marginBottom: 10,
                background: activeTab === 'businesses' ? '#7C3AED' : 'rgba(139, 92, 246, 0.15)',
                color: '#fff',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}
            >
              <Building2 size={18} />
              <span>Client Businesses</span>
            </button>
          )}

          {/* Business Workspace Navigation */}
          {(!isSuperAdmin || selectedBusiness) && (
            <>
              <button 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => navigateTab('dashboard')}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => navigateTab('inventory')}
              >
                <Package size={18} />
                <span>Stock Inventory</span>
                {dashboardData?.stock?.lowStockCount > 0 && (
                  <span className="nav-badge">{dashboardData.stock.lowStockCount} Low</span>
                )}
              </button>

              <button 
                className={`nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => navigateTab('invoices')}
              >
                <FileText size={18} />
                <span>Sales Invoices</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'purchases' ? 'active' : ''}`}
                onClick={() => navigateTab('purchases')}
              >
                <ShoppingCart size={18} />
                <span>Purchase Bills</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'quotations' ? 'active' : ''}`}
                onClick={() => navigateTab('quotations')}
              >
                <FileSpreadsheet size={18} />
                <span>Estimates / Quotes</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'parties' ? 'active' : ''}`}
                onClick={() => navigateTab('parties')}
              >
                <Users size={18} />
                <span>Customers & Vendors</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => navigateTab('reports')}
              >
                <BarChart3 size={18} />
                <span>GST Reports & Profit</span>
              </button>

              <button 
                className="nav-item"
                style={{ marginTop: 6 }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowProfileModal(true);
                }}
              >
                <Settings size={18} />
                <span>Business Settings</span>
              </button>
            </>
          )}
        </nav>

        {/* Business Mini Badge at bottom */}
        {(!isSuperAdmin || selectedBusiness) && (
          <div 
            onClick={() => {
              setMobileMenuOpen(false);
              setShowProfileModal(true);
            }}
            style={{ 
              marginTop: 'auto', 
              padding: '12px 14px', 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}
            title="Click to view business profile"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                {effectiveBusinessName}
              </div>
              <Settings size={14} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              GSTIN: {selectedBusiness?.gstin || profile?.gstin || 'Unregistered'}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Super Admin Top Indicator if viewing a specific client workspace */}
        {isSuperAdmin && selectedBusiness && (
          <div className="admin-workspace-banner" style={{
            background: '#6D28D9',
            color: '#fff',
            padding: '8px 20px',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} /> <span>Workspace: <strong>{selectedBusiness.business_name}</strong></span>
            </div>
            <button 
              onClick={handleExitBusinessWorkspace}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                padding: '3px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <ArrowLeft size={14} /> Back to All
            </button>
          </div>
        )}

        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button 
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            <span className="top-bar-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeTab === 'businesses' ? 'Client Businesses' :
               activeTab === 'invoices' ? 'Sales Invoices' : 
               activeTab === 'inventory' ? 'Stock Inventory' : 
               activeTab === 'purchases' ? 'Purchase Bills' : 
               activeTab === 'quotations' ? 'Quotations' : 
               activeTab === 'parties' ? 'Customer & Vendor Ledgers' : 
               activeTab === 'reports' ? 'GST Reports' : 
               'Dashboard'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {(!isSuperAdmin || selectedBusiness) && (
              <>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => { fetchDashboard(); fetchProfile(); }}
                  title="Sync Data"
                >
                  <RefreshCw size={14} /> <span className="hide-mobile">Refresh</span>
                </button>

                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => navigateTab('invoices')}
                >
                  <Plus size={15} /> <span className="hide-mobile">+ New GST Invoice</span><span className="show-mobile-only">+ Bill</span>
                </button>
              </>
            )}

            {/* User Session Chip & Logout */}
            <div className="user-session-chip" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-md)'
            }}>
              <div className="user-session-details" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                  {currentUser.full_name}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isSuperAdmin ? '#C4B5FD' : '#60A5FA' }}>
                  {isSuperAdmin ? 'ADMIN' : 'OWNER'}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', color: '#F87171' }}
                title="Log Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

        <main className="content-body">
          {activeTab === 'businesses' && isSuperAdmin && (
            <BusinessManagement 
              onSelectBusiness={handleSelectBusinessWorkspace}
            />
          )}

          {activeTab === 'dashboard' && (
            <Dashboard 
              data={dashboardData}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenNewInvoice={() => setActiveTab('invoices')}
              onOpenNewItem={() => setActiveTab('inventory')}
              onViewInvoice={(id) => setViewInvoiceId(id)}
            />
          )}

          {activeTab === 'inventory' && (
            <Inventory 
              onRefreshDashboard={fetchDashboard}
            />
          )}

          {activeTab === 'invoices' && (
            <Invoicing 
              businessProfile={profile || selectedBusiness}
              onViewInvoice={(id) => setViewInvoiceId(id)}
              onRefreshDashboard={fetchDashboard}
            />
          )}

          {activeTab === 'purchases' && (
            <Purchases 
              businessProfile={profile || selectedBusiness}
              onRefreshDashboard={fetchDashboard}
            />
          )}

          {activeTab === 'quotations' && (
            <Quotations 
              businessProfile={profile || selectedBusiness}
              onRefreshDashboard={fetchDashboard}
              onViewInvoice={(id) => setViewInvoiceId(id)}
            />
          )}

          {activeTab === 'parties' && (
            <Parties 
              businessProfile={profile || selectedBusiness}
            />
          )}

          {activeTab === 'reports' && (
            <Reports />
          )}
        </main>
      </div>

      {/* Fixed Bottom Navigation Bar for Mobile */}
      <nav className="mobile-bottom-nav">
        {isSuperAdmin && !selectedBusiness ? (
          <>
            <button 
              className={`mobile-nav-btn ${activeTab === 'businesses' ? 'active' : ''}`}
              onClick={() => navigateTab('businesses')}
            >
              <Building2 size={20} />
              <span>Businesses</span>
            </button>
            <button 
              className="mobile-nav-btn"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
              <span>Menu</span>
            </button>
            <button 
              className="mobile-nav-btn"
              style={{ color: '#F87171' }}
              onClick={handleLogout}
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <button 
              className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigateTab('dashboard')}
            >
              <LayoutDashboard size={20} />
              <span>Home</span>
            </button>
            <button 
              className={`mobile-nav-btn ${activeTab === 'invoices' ? 'active' : ''}`}
              onClick={() => navigateTab('invoices')}
            >
              <FileText size={20} />
              <span>Invoices</span>
            </button>
            <button 
              className={`mobile-nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => navigateTab('inventory')}
            >
              <Package size={20} />
              <span>Stock</span>
              {dashboardData?.stock?.lowStockCount > 0 && (
                <span className="mobile-nav-badge">{dashboardData.stock.lowStockCount}</span>
              )}
            </button>
            <button 
              className={`mobile-nav-btn ${activeTab === 'purchases' ? 'active' : ''}`}
              onClick={() => navigateTab('purchases')}
            >
              <ShoppingCart size={20} />
              <span>Purchases</span>
            </button>
            <button 
              className="mobile-nav-btn"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
              <span>More</span>
            </button>
          </>
        )}
      </nav>

      {/* Invoice View & Print Modal */}
      {viewInvoiceId && (
        <InvoiceModal 
          invoiceId={viewInvoiceId}
          onClose={() => setViewInvoiceId(null)}
        />
      )}

      {/* Business Setup / Settings Modal */}
      {showProfileModal && (
        <BusinessSetupModal 
          profile={profile}
          isFirstTime={false}
          onClose={() => setShowProfileModal(false)}
          onSaveSuccess={(newProfile) => {
            setProfile(newProfile);
            setShowProfileModal(false);
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
}
