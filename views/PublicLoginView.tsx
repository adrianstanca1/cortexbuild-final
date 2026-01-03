import React from 'react';
import LoginView from './LoginView';
import { Page } from '@/types';

interface PublicLoginViewProps {
  setPage: (page: Page) => void;
}

const PublicLoginView: React.FC<PublicLoginViewProps> = ({ setPage }) => {
  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-zinc-50/50 relative">
          <LoginView setPage={setPage} />
        </main>
      </div>
    </div>
  );
};

export default PublicLoginView;
