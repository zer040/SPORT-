import React, { useState, useEffect } from 'react';
import { Sidebar, AdminTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { VenuesView } from './components/VenuesView';
import { UsersView } from './components/UsersView';
import { TransactionsView } from './components/TransactionsView';
import {
  AdminApi,
  DashboardStats,
  AdminVenue,
  AdminUser,
  AdminTransaction,
} from './services/adminApi';

export function App() {
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [sData, vData, uData, tData] = await Promise.allSettled([
        AdminApi.getStats(),
        AdminApi.getVenues(),
        AdminApi.getUsers(),
        AdminApi.getTransactions(),
      ]);

      if (sData.status === 'fulfilled') setStats(sData.value);
      if (vData.status === 'fulfilled') setVenues(vData.value);
      if (uData.status === 'fulfilled') setUsers(uData.value);
      if (tData.status === 'fulfilled') setTransactions(tData.value);
    } catch (err) {
      console.warn('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const getHeaderInfo = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Dashboard',
          subtitle: '',
        };
      case 'venues':
        return {
          title: 'Venues',
          subtitle: '',
        };
      case 'users':
        return {
          title: 'Users',
          subtitle: '',
        };
      case 'transactions':
        return {
          title: 'Finance',
          subtitle: '',
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          onRefresh={loadAllData}
          loading={loading}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView stats={stats} loading={loading} />
          )}
          {currentTab === 'venues' && (
            <VenuesView venues={venues} onRefresh={loadAllData} />
          )}
          {currentTab === 'users' && (
            <UsersView users={users} onRefresh={loadAllData} />
          )}
          {currentTab === 'transactions' && (
            <TransactionsView transactions={transactions} onRefresh={loadAllData} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
