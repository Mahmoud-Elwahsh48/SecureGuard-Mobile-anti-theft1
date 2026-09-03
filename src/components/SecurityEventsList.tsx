import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Send,
  Trash2,
  Download,
  Search,
  MapPin,
  Battery,
  Wifi,
  Eye,
  RefreshCw,
  AlertOctagon,
} from 'lucide-react';
import { SecurityEvent, EventStatus } from '../types';

interface SecurityEventsListProps {
  events: SecurityEvent[];
  onSelectEvent: (event: SecurityEvent) => void;
  onResendAlert: (event: SecurityEvent) => void;
  onDeleteEvent: (id: number) => void;
  onClearAll: () => void;
  isResendingId: number | null;
}

export const SecurityEventsList: React.FC<SecurityEventsListProps> = ({
  events,
  onSelectEvent,
  onResendAlert,
  onDeleteEvent,
  onClearAll,
  isResendingId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.ipAddress && ev.ipAddress.includes(searchQuery));
    const matchesStatus = statusFilter === 'all' || ev.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportEventsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `safeguard-security-events-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'authorized':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3 w-3" />
            <span>Authorized</span>
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400 border border-blue-500/20">
            <Send className="h-3 w-3" />
            <span>Alert Sent</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" />
            <span>Pending Dispatch</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400 border border-rose-500/20">
            <AlertOctagon className="h-3 w-3" />
            <span>Failed</span>
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg backdrop-blur-sm overflow-hidden">
      {/* List Header & Controls */}
      <div className="border-b border-slate-800 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">
                Security Incident Log (Room DB Replica)
              </h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-300">
                {events.length}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Persistent encrypted storage of all trigger incidents, telemetry, and stealth captures
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="export-events-btn"
              onClick={exportEventsJson}
              title="Export Events JSON"
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </button>

            {events.length > 0 && (
              <button
                id="clear-all-events-btn"
                onClick={onClearAll}
                title="Clear All Incident Logs"
                className="flex items-center space-x-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="search-events-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event, condition, IP..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-2.5 text-sm sm:text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {['all', 'authorized', 'sent', 'pending', 'failed'].map((st) => (
              <button
                key={st}
                id={`filter-${st}-btn`}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-2 text-xs font-medium capitalize transition whitespace-nowrap active:scale-95 min-h-[36px] ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Table / List */}
      {filteredEvents.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          <ShieldAlert className="mx-auto h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-300">No security events found</p>
          <p className="text-xs text-slate-500 mt-1">
            Test a trigger above or clear search filters to inspect incident logs
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60 max-h-[480px] overflow-y-auto">
          {filteredEvents.map((event) => {
            const isUnauthorized = event.eventType.toLowerCase().includes('unrecognized') || event.status === 'sent';

            return (
              <div
                key={event.id}
                id={`event-item-${event.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 transition hover:bg-slate-800/30 gap-3"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  {/* Photo or Icon Preview */}
                  <div
                    onClick={() => onSelectEvent(event)}
                    className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center group"
                  >
                    {event.photoPath ? (
                      <img
                        src={event.photoPath}
                        alt="Capture thumbnail"
                        className="h-full w-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center ${
                          isUnauthorized ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {isUnauthorized ? (
                          <ShieldAlert className="h-6 w-6" />
                        ) : (
                          <ShieldCheck className="h-6 w-6" />
                        )}
                      </div>
                    )}
                    <span className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 flex items-center justify-center transition">
                      <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition" />
                    </span>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-none">
                        {event.eventType}
                      </h4>
                      {getStatusBadge(event.status)}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-300 break-words">{event.message}</p>

                    {/* Metadata chips */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>{new Date(event.timestamp).toLocaleString()}</span>
                      </span>

                      {event.batteryLevel != null && (
                        <span className="flex items-center space-x-1">
                          <Battery className="h-3 w-3 text-slate-500 shrink-0" />
                          <span>{event.batteryLevel}%</span>
                        </span>
                      )}

                      {event.networkState && (
                        <span className="flex items-center space-x-1">
                          <Wifi className="h-3 w-3 text-slate-500 shrink-0" />
                          <span className="capitalize">{event.networkState}</span>
                        </span>
                      )}

                      {event.latitude != null && event.longitude != null && (
                        <a
                          href={`https://maps.google.com/?q=${event.latitude},${event.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition"
                        >
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>
                            {event.latitude.toFixed(2)}, {event.longitude.toFixed(2)}
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                  <button
                    id={`view-event-btn-${event.id}`}
                    onClick={() => onSelectEvent(event)}
                    className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95 min-h-[38px]"
                  >
                    Details
                  </button>

                  {event.status !== 'authorized' && (
                    <button
                      id={`resend-alert-btn-${event.id}`}
                      onClick={() => onResendAlert(event)}
                      disabled={isResendingId === event.id}
                      title="Dispatch alert payload now"
                      aria-label="Dispatch alert payload now"
                      className="flex items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/20 transition disabled:opacity-50 active:scale-95 min-h-[38px]"
                    >
                      {isResendingId === event.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  <button
                    id={`delete-event-btn-${event.id}`}
                    onClick={() => onDeleteEvent(event.id)}
                    title="Delete record"
                    aria-label="Delete record"
                    className="flex h-9 w-9 items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
