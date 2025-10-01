'use client';

import React, { useState, useEffect } from 'react';
import { History, Clock, User } from 'lucide-react';
import { api } from '@/lib/api';

interface DateHistoryEntry {
  id: string;
  releasePlanId: string;
  fieldName: string;
  oldDate: string | null;
  newDate: string | null;
  changedBy: string;
  changedAt: string;
  changeReason: string | null;
  changedByName: string;
  changedByEmail: string;
}

interface DateHistoryTooltipProps {
  releasePlanId: string;
  fieldName: string;
  currentValue: string | null;
  children: React.ReactNode;
}

export function DateHistoryTooltip({ 
  releasePlanId, 
  fieldName, 
  currentValue, 
  children 
}: DateHistoryTooltipProps) {
  const [history, setHistory] = useState<DateHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const fetchHistory = async () => {
    if (!releasePlanId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/audit-logs/date-history/${releasePlanId}?fieldName=${fieldName}`);
      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch date history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showTooltip && history.length === 0) {
      fetchHistory();
    }
  }, [showTooltip, releasePlanId, fieldName]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasHistory = history.length > 0;

  return (
    <div className="relative inline-block">
      {children}
      {hasHistory && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
            <History className="h-3 w-3 inline mr-1" />
            {history.length} change{history.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
      
      {showTooltip && hasHistory && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 z-50 w-80">
          <div className="bg-white border-2 border-black rounded-lg shadow-lg p-4">
            <div className="flex items-center mb-3">
              <History className="h-4 w-4 mr-2" />
              <h3 className="font-bold text-sm">Date History</h3>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {history.map((entry, index) => (
                <div key={entry.id} className="border-l-2 border-gray-200 pl-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      Change #{history.length - index}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(entry.changedAt)}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {entry.oldDate && (
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">From:</span>
                        <span className="text-xs line-through text-red-600">
                          {formatDate(entry.oldDate)}
                        </span>
                      </div>
                    )}
                    
                    {entry.newDate && (
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">To:</span>
                        <span className="text-xs font-medium text-green-600">
                          {formatDate(entry.newDate)}
                        </span>
                      </div>
                    )}
                    
                    {!entry.oldDate && entry.newDate && (
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">Set to:</span>
                        <span className="text-xs font-medium text-blue-600">
                          {formatDate(entry.newDate)}
                        </span>
                      </div>
                    )}
                    
                    {entry.oldDate && !entry.newDate && (
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">Removed:</span>
                        <span className="text-xs line-through text-red-600">
                          {formatDate(entry.oldDate)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center mt-2">
                    <User className="h-3 w-3 mr-1 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {entry.changedByName} ({entry.changedByEmail})
                    </span>
                  </div>
                  
                  {entry.changeReason && (
                    <div className="mt-1">
                      <span className="text-xs text-gray-500 italic">
                        "{entry.changeReason}"
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {loading && (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="ml-2 text-xs text-gray-600">Loading...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

