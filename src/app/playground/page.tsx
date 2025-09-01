'use client';

import { Suspense } from 'react';
import { PlaygroundInterface } from '@/components/playground/PlaygroundInterface';

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<div>Loading playground...</div>}>
      <PlaygroundInterface />
    </Suspense>
  );
}