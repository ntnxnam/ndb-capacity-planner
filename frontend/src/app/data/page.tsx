'use client';

import { useEffect, useState } from 'react';
import { useOktaAuth } from '@/lib/localAuthHook';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api, User, DataEntry, DataField } from '@/lib/api';
import { 
  Database, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Loader2,
  FileText
} from 'lucide-react';

export default function DataPage() {
  const { authState } = useOktaAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [fields, setFields] = useState<DataField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchUserProfile();
      fetchData();
      fetchFields();
    }
  }, [authState]);

  const fetchUserProfile = async () => {
    try {
      const profile = await api.getUserProfile();
      setUser(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.getDataEntries();
      setEntries(data);
    } catch (error) {
      console.error('Error fetching data entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFields = async () => {
    try {
      const fieldsData = await api.getDataFields();
      setFields(fieldsData);
    } catch (error) {
      console.error('Error fetching data fields:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this data entry?')) {
      try {
        await api.deleteDataEntry(id);
        await fetchData();
      } catch (error) {
        console.error('Error deleting data entry:', error);
      }
    }
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="h-8 w-8 text-blue-600" />
              Data Entries
            </h1>
            <p className="text-gray-600 mt-2">
              Manage capacity planning data entries
            </p>
          </div>
          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <button 
              onClick={() => router.push('/data/new')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Data Entry
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid gap-6">
            {entries.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No data entries found
                </h3>
                <p className="text-gray-600 mb-4">
                  Get started by creating your first data entry
                </p>
                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <button 
                    onClick={() => router.push('/data/new')}
                    className="btn-primary flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Add Data Entry
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entry Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {Object.keys(entry.data).slice(0, 3).map(key => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {String(entry.data[key])}
                              </div>
                            ))}
                            {Object.keys(entry.data).length > 3 && (
                              <div className="text-gray-500 text-xs">
                                +{Object.keys(entry.data).length - 3} more fields
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{entry.created_by_name}</div>
                          <div className="text-sm text-gray-500">{entry.created_by_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => router.push(`/data/${entry.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {(user?.role === 'admin' || user?.role === 'superadmin') && (
                              <>
                                <button 
                                  onClick={() => router.push(`/data/${entry.id}/edit`)}
                                  className="text-yellow-600 hover:text-yellow-900"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(entry.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

