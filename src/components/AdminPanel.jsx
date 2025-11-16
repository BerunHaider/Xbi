import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Shield, AlertCircle, Ban, Users, Activity, TrendingUp } from 'lucide-react';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    verifyAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, activeTab]);

  const verifyAdmin = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);

    const { data } = await supabase.rpc('is_admin', { p_user_id: authUser.id });
    if (!data) {
      window.location.href = '/feed';
      return;
    }
    setIsAdmin(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const { data } = await supabase
          .from('user_reports')
          .select('*')
          .order('created_at', { ascending: false });
        setReports(data || []);
      } else if (activeTab === 'users') {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReportAction = async (reportId, action, notes) => {
    try {
      await supabase
        .from('user_reports')
        .update({ status: action, resolution_notes: notes, resolved_at: new Date() })
        .eq('id', reportId);

      setReports(reports.filter(r => r.id !== reportId));
      alert('Reporte actualizado');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const suspendUser = async (userId, days, reason) => {
    try {
      await supabase.rpc('create_moderation_action', {
        p_user_id: userId,
        p_action_type: 'suspend',
        p_duration_days: days,
        p_reason: reason,
        p_created_by: user.id
      });
      alert('Usuario suspendido');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const Dashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Panel de Control</h2>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Usuarios" value="1,234" />
        <StatCard icon={AlertCircle} title="Reportes Pendientes" value={reports.filter(r => r.status === 'pending').length} />
        <StatCard icon={Activity} title="Acciones de Mod." value="56" />
        <StatCard icon={TrendingUp} title="Actividad Hoy" value="89%" />
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Actividad Reciente</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-sm">Usuario {i} fue reportado</span>
              <span className="text-xs text-gray-500">Hace 2h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ReportsTab = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Reportes de Usuarios</h2>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{report.reason}</p>
                  <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                  <div className="flex gap-2 mt-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReportAction(report.id, 'resolved', 'Acción tomada')}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Resolver
                  </button>
                  <button
                    onClick={() => handleReportAction(report.id, 'dismissed', 'Sin fundamento')}
                    className="px-3 py-1 bg-gray-300 text-gray-800 text-sm rounded hover:bg-gray-400"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const UsersTab = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="space-y-3">
          {users.slice(0, 10).map(profile => (
            <div key={profile.id} className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={profile.avatar_url || 'https://via.placeholder.com/40'}
                  alt={profile.username}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-semibold">@{profile.username}</p>
                  <p className="text-xs text-gray-500">{profile.followers_count} seguidores</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => suspendUser(profile.id, 7, 'Violación de términos')}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                >
                  <Ban className="w-4 h-4" /> Suspender
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const StatCard = ({ icon: Icon, title, value }) => (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-twitter-600 opacity-50" />
      </div>
    </div>
  );

  if (!isAdmin) return <p>Cargando...</p>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-twitter-600" />
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 bg-white p-2 rounded-lg shadow w-fit">
          {['dashboard', 'reports', 'users'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded font-medium transition ${
                activeTab === tab
                  ? 'bg-twitter-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-twitter-600 opacity-50" />
      </div>
    </div>
  );
}
