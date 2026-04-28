'use client';

import { useEffect, useState } from 'react';

export function ColophonClock() {
  const [clock, setClock] = useState(() => fmt(new Date()));
  useEffect(() => {
    const id = setInterval(() => setClock(fmt(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>printed by the worker · {clock} UTC</span>;
}

function fmt(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(
    d.getUTCMinutes(),
  ).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}`;
}
