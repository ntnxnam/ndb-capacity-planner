'use client';

import React from 'react';
import { useOktaAuth } from '@/lib/localAuthHook';
import { useRouter } from 'next/navigation';
import { 
  Database, 
  Users, 
  Settings, 
  Calculator, 
  FileText,
  LogOut,
  Menu,
  X,
  Calendar,
  Activity,
  GitBranch
} from 'lucide-react';
import { useState } from 'react';
import { User } from '@/lib/api';
import { Breadcrumbs } from './Breadcrumbs';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  user?: User;
}

export function Layout({ children, user }: LayoutProps) {
  const { oktaAuth } = useOktaAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('local_access_token');
      await oktaAuth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Database, roles: ['user', 'admin', 'superadmin'] },
    { name: 'Data Entries', href: '/data', icon: FileText, roles: ['user', 'admin', 'superadmin'] },
    { name: 'Calculations', href: '/calculations', icon: Calculator, roles: ['user', 'admin', 'superadmin'] },
    { name: 'Release Plans', href: '/release-plans', icon: Calendar, roles: ['user', 'admin', 'superadmin'] },
    { name: 'JIRA Releases', href: '/jira-releases', icon: GitBranch, roles: ['admin', 'superadmin'] },
    { name: 'Audit Logs', href: '/audit-logs', icon: Activity, roles: ['admin', 'superadmin'] },
    { name: 'Configuration', href: '/config', icon: Settings, roles: ['superadmin'] },
    { name: 'User Management', href: '/users', icon: Users, roles: ['admin', 'superadmin'] },
  ];

  const filteredNavigation = user?.role 
    ? navigation.filter(item => item.roles.includes(user.role))
    : navigation; // Show all navigation items when user is not loaded

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Add dashboard as first item if not on home page
    if (pathname !== '/') {
      breadcrumbs.push({
        label: 'Dashboard',
        href: '/',
        icon: <Database className="h-4 w-4" />
      });
    }

    // Add current page breadcrumbs
    pathSegments.forEach((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/');
      const navItem = navigation.find(item => item.href === href);
      
      if (navItem) {
        breadcrumbs.push({
          label: navItem.name,
          href: href,
          icon: React.createElement(navItem.icon, { className: "h-4 w-4" })
        });
      } else {
        // Handle dynamic routes or unknown segments
        const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        breadcrumbs.push({
          label: label,
          href: href
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const showBackButton = pathname !== '/' && breadcrumbs.length > 1;

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'badge badge-superadmin';
      case 'admin': return 'badge badge-admin';
      case 'user': return 'badge badge-user';
      default: return 'badge';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl border-r-2 border-black">
            <SidebarContent 
              navigation={filteredNavigation} 
              user={user} 
              onLogout={handleLogout}
              getRoleBadgeClass={getRoleBadgeClass}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:w-64 md:block">
        <div className="flex flex-col h-full bg-white border-r-2 border-black">
          <SidebarContent 
            navigation={filteredNavigation} 
            user={user} 
            onLogout={handleLogout}
            getRoleBadgeClass={getRoleBadgeClass}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-4 bg-white border-b-2 border-black lg:px-6">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6 text-black" />
          </button>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-sm">
                  <p className="font-medium text-black">{user.name}</p>
                  <p className="text-gray-600">{user.email}</p>
                </div>
                <span className={getRoleBadgeClass(user.role)}>
                  {user.role}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Breadcrumbs */}
        <Breadcrumbs 
          items={breadcrumbs} 
          showBackButton={showBackButton}
        />

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  navigation: Array<{ name: string; href: string; icon: any; roles: string[] }>;
  user?: User;
  onLogout: () => void;
  getRoleBadgeClass: (role?: string) => string;
  onClose?: () => void;
}

function SidebarContent({ navigation, user, onLogout, getRoleBadgeClass, onClose }: SidebarContentProps) {
  const router = useRouter();

  const handleNavigation = (href: string) => {
    router.push(href);
    onClose?.();
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black">
        <div className="flex items-center space-x-2">
          <Database className="h-8 w-8 text-black" />
          <div>
            <h1 className="text-lg font-bold text-black">NDB Planner</h1>
            <p className="text-xs text-gray-600">Capacity Planning</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden">
            <X className="h-6 w-6 text-gray-600" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium text-black rounded-lg hover:bg-gray-100 hover:text-black transition-colors border-2 border-transparent hover:border-black"
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {user && (
        <div className="px-4 py-4 border-t-2 border-black">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-black">{user.name}</p>
            <p className="text-xs text-gray-600 mb-2">{user.email}</p>
            <span className={getRoleBadgeClass(user.role)}>
              {user.role}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors border-2 border-transparent hover:border-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </>
  );
}

