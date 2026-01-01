"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Database,
  BarChart3,
  Settings,
  LogOut,
  Upload,
  RefreshCcw,
  Search,
  Bell,
  Menu,
  X,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

import { StatsCard } from '../../components/admin/StatsCard.js';
import { DataManagement } from '../../components/admin/DataManagement.js';
import { UserManagement } from '../../components/admin/UserManagement.js';
import { SystemSettings } from '../../components/admin/SystemSetting.js';
import { ToastContainer, showToast } from '../../components/admin/Toast.js';

const API_BASE_URL = 'http://localhost:3001';

export default function App() {
  const [activeTab, setActiveTab] = useState('data');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const [tickersResponse, dataResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/data/tickers`),
        axios.get(`${API_BASE_URL}/api/data/aggregate?date=${new Date().toISOString().split('T')[0]}`)
      ]);

      setStats({
        tickerCount: tickersResponse.data.success ? tickersResponse.data.data.length : 0,
        dataCount: dataResponse.data.success ? dataResponse.data.data.records.length : 0,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      showToast('error', 'Failed to fetch system statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleFileUpload = async (file) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        showToast('success', `File uploaded! ${response.data.data.recordsProcessed} records processed.`);
        await fetchStats();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
      showToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    showToast('info', 'Logged out successfully');
    setTimeout(() => {
      window.location.href = '#/login';
    }, 1000);
  };

  const NavItem = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === id
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-white' : 'group-hover:text-indigo-600'}`} />
      <span className="font-medium">{label}</span>
      {activeTab === id && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Seasonality <span className="text-indigo-600">Pro</span></h1>
            </div>
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto mt-4">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Core Management</p>
            <NavItem id="data" label="Data Management" icon={Database} />
            <NavItem id="users" label="User Access" icon={Users} />
            <div className="my-8 h-px bg-slate-100 mx-4"></div>
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">System</p>
            <NavItem id="settings" label="Settings" icon={Settings} />
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors group"
            >
              <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center space-x-4">
            <button className="lg:hidden p-2 hover:bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources..."
                className="bg-slate-50 border-none rounded-full pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 mr-4 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-medium text-slate-600 italic">API Live</span>
            </div>
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center space-x-3 cursor-pointer group">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-900 leading-none">Admin User</p>
                <p className="text-xs text-slate-500 mt-1">Super Administrator</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-200">
                <span className="text-indigo-600 font-bold text-sm">AU</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h2>
                <p className="text-slate-500 mt-1">Welcome back. Monitoring seasonality engine health.</p>
              </div>
              <button
                onClick={fetchStats}
                disabled={isLoading}
                className="flex items-center justify-center space-x-2 bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-slate-700 font-semibold text-sm active:scale-95"
              >
                <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Insights</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title="Total Tickers"
                value={stats?.tickerCount ?? 0}
                icon={BarChart3}
                color="indigo"
              />
              <StatsCard
                title="Active Data Points"
                value={stats?.dataCount.toLocaleString() ?? '0'}
                icon={Database}
                color="emerald"
              />
              <StatsCard
                title="Engine Uptime"
                value="99.9%"
                icon={ShieldCheck}
                color="violet"
                subtitle={`Last sync: ${stats ? new Date(stats.lastUpdated).toLocaleTimeString() : 'Never'}`}
              />
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
              <div className="border-b border-slate-100 px-8 py-6 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-bold text-slate-900">
                    {activeTab === 'data' ? 'Seasonality Data Control' : activeTab === 'users' ? 'User Access Registry' : 'System Configuration'}
                  </h3>
                </div>
              </div>

              <div className="p-8">
                {activeTab === 'data' && <DataManagement onUpload={handleFileUpload} />}
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'settings' && <SystemSettings />}
              </div>
            </div>
          </div>
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
