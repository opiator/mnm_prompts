'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Navigation() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
      });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold">MNM Prompts</h1>
            </div>
            <div className="hidden md:ml-8 md:flex md:items-center md:space-x-4">
              <a
                href="/prompts"
                className="text-foreground/60 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Prompts
              </a>
              <a
                href="/datasets"
                className="text-foreground/60 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Datasets
              </a>
              <a
                href="/playground"
                className="text-foreground/60 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Playground
              </a>
              <a
                href="/settings"
                className="text-foreground/60 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Settings
              </a>
            </div>
          </div>
          <div className="flex items-center">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-sm"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
