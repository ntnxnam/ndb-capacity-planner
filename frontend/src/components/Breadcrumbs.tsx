'use client';

import React from 'react';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  onBack?: () => void;
}

export function Breadcrumbs({ items, showBackButton = false, onBack }: BreadcrumbsProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 bg-white">
      <div className="flex items-center space-x-2">
        {showBackButton && (
          <button
            onClick={handleBack}
            className="flex items-center space-x-1 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        )}
        
        {showBackButton && items.length > 0 && (
          <div className="w-px h-4 bg-gray-300"></div>
        )}
        
        <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
          <a
            href="/"
            className="flex items-center text-gray-500 hover:text-black transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </a>
          
          {items.map((item, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              {item.href ? (
                <a
                  href={item.href}
                  className="flex items-center space-x-1 text-gray-600 hover:text-black transition-colors"
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span className="text-sm font-medium">{item.label}</span>
                </a>
              ) : (
                <div className="flex items-center space-x-1 text-black">
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
    </div>
  );
}

