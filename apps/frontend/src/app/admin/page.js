'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { FaUsers, FaUpload, FaChartBar, FaCog, FaSignOutAlt } from 'react-icons/fa'
import UserManagement from '@/components/admin/UserManagement'
import SystemStats from '@/components/admin/SystemStats'
import DataManagement from '@/components/admin/DataManagement'

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('data')
    const [isLoading, setIsLoading] = useState(false)
    const [stats, setStats] = useState(null)

    // API base URL
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    // Fetch system statistics
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setIsLoading(true)
                const [tickersResponse, dataResponse] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/data/tickers`),
                    axios.get(`${API_BASE_URL}/api/data/aggregate?date=${new Date().toISOString().split('T')[0]}`),
                ])

                setStats({
                    tickerCount: tickersResponse.data.success ? tickersResponse.data.data.length : 0,
                    dataCount: dataResponse.data.success ? dataResponse.data.data.records.length : 0,
                    lastUpdated: new Date().toISOString(),
                })
            } catch (error) {
                console.error('Error fetching stats:', error)
                toast.error('Failed to fetch system statistics')
            } finally {
                setIsLoading(false)
            }
        }

        fetchStats()
    }, [])

    const handleLogout = () => {
        // Implement logout logic
        toast.info('Logged out successfully')
        // Redirect to login page
        window.location.href = '/login'
    }

    return (
        <div className='flex min-h-screen bg-gray-50'>
            {/* Sidebar */}
            <div className='w-64 bg-white shadow-md'>
                <div className='p-4 border-b'>
                    <h1 className='text-xl font-bold text-gray-800'>Seasonality Admin</h1>
                </div>

                <nav className='p-4 space-y-2'>
                    <button
                        onClick={() => setActiveTab('data')}
                        className={`w-full flex items-center space-x-3 p-2 rounded-md ${
                            activeTab === 'data' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <FaChartBar className='text-lg' />
                        <span>Data Management</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full flex items-center space-x-3 p-2 rounded-md ${
                            activeTab === 'users' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <FaUsers className='text-lg' />
                        <span>User Management</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center space-x-3 p-2 rounded-md ${
                            activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <FaCog className='text-lg' />
                        <span>Settings</span>
                    </button>
                </nav>

                <div className='p-4 mt-auto border-t'>
                    <button
                        onClick={handleLogout}
                        className='w-full flex items-center space-x-3 p-2 rounded-md text-gray-600 hover:bg-gray-50'
                    >
                        <FaSignOutAlt className='text-lg' />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className='flex-1 p-8'>
                <div className='mb-6'>
                    <h2 className='text-2xl font-bold text-gray-800'>Admin Dashboard</h2>
                    <p className='text-gray-500'>Manage your seasonality data and users</p>
                </div>

                {/* System Stats */}
                {stats && (
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
                        <SystemStats
                            title='Total Tickers'
                            value={stats.tickerCount}
                            icon={<FaChartBar className='text-blue-500 text-2xl' />}
                        />
                        <SystemStats
                            title='Data Points'
                            value={stats.dataCount}
                            icon={<FaChartBar className='text-green-500 text-2xl' />}
                        />
                        <SystemStats
                            title='Last Updated'
                            value={
                                stats?.lastUpdated
                                    ? new Date(stats.lastUpdated).toLocaleString('en-GB', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                      })
                                    : '—'
                            }
                            icon={<FaCog className='text-purple-500 text-2xl' />}
                        />
                    </div>
                )}

                {/* Tab Content */}
                <div className='bg-white rounded-lg shadow-md p-6'>
                    {activeTab === 'data' && <DataManagement />}

                    {activeTab === 'users' && <UserManagement />}

                    {activeTab === 'settings' && (
                        <div>
                            <h3 className='text-xl font-semibold text-gray-700 mb-4'>System Settings</h3>
                            <p className='text-gray-500'>Configure system parameters and preferences</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
