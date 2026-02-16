import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileText,
  Briefcase,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/alerts', icon: AlertTriangle, label: 'AML Alerts' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/cases', icon: Briefcase, label: 'Cases' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        data-testid="sidebar"
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r-0"
        style={{
          width: collapsed ? 64 : 260,
          backgroundColor: '#1a1d23',
          transition: 'width 200ms ease-out',
        }}
      >
        {/* Logo / Branding */}
        <div
          className="flex items-center gap-3 px-5 py-5 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)', minHeight: 64 }}
        >
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            }}
          >
            <Shield className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <span
              data-testid="sidebar-brand"
              className="text-lg font-semibold tracking-tight"
              style={{
                color: '#f1f5f9',
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              Sentinel
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto" data-testid="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);

            const linkContent = (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="relative flex items-center gap-3 rounded-md transition-colors duration-150"
                style={{
                  padding: collapsed ? '10px 0' : '10px 14px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? '#f1f5f9' : '#94a3b8',
                  backgroundColor: isActive
                    ? 'rgba(59, 130, 246, 0.12)'
                    : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor =
                      'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                    style={{
                      width: 3,
                      height: 24,
                      backgroundColor: '#3b82f6',
                      marginLeft: collapsed ? 0 : -14,
                    }}
                  />
                )}
                <item.icon
                  className="flex-shrink-0"
                  style={{
                    width: 20,
                    height: 20,
                    color: isActive ? '#3b82f6' : 'inherit',
                  }}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {!collapsed && (
                  <span
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {item.label}
                  </span>
                )}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="text-xs font-medium"
                    sideOffset={8}
                  >
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.to}>{linkContent}</div>;
          })}
        </nav>

        {/* Analyst Info */}
        <div
          className="px-4 py-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          data-testid="sidebar-analyst"
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center justify-center rounded-full mx-auto"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  SC
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <div className="text-xs">
                  <div className="font-medium">Sarah Chen</div>
                  <div className="text-muted-foreground">
                    Senior Compliance Analyst
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#3b82f6',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                SC
              </div>
              <div className="overflow-hidden">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: '#e2e8f0' }}
                >
                  Sarah Chen
                </div>
                <div
                  className="text-xs truncate"
                  style={{ color: '#64748b' }}
                >
                  Senior Compliance Analyst
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <div
          className="px-2 py-2 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <button
            data-testid="sidebar-toggle"
            onClick={onToggle}
            className="flex items-center justify-center w-full rounded-md transition-colors duration-150 cursor-pointer"
            style={{
              height: 36,
              color: '#64748b',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
