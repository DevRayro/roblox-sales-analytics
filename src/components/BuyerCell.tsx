import React, { useEffect, useState } from 'react';
import { SaleRecord } from '../types';
import { userHeadshotBatcher, userNameBatcher } from '../utils/apiBatcher';

interface BuyerCellProps {
  record: SaleRecord;
}

export function BuyerCell({ record }: BuyerCellProps) {
  const [headshotUrl, setHeadshotUrl] = useState<string | null>(null);
  const [fetchedName, setFetchedName] = useState<string | null>(null);
  
  useEffect(() => {
    if (!record.buyerUserId || record.buyerUserId === 'Unknown') return;
    
    let isMounted = true;

    userHeadshotBatcher.fetch(record.buyerUserId)
      .then(url => {
        if (isMounted && url) setHeadshotUrl(url);
      })
      .catch(err => console.error('Failed to fetch headshot', err));

    userNameBatcher.fetch(record.buyerUserId)
      .then(name => {
        if (isMounted && name) setFetchedName(name);
      })
      .catch(err => console.error('Failed to fetch username', err));

    return () => {
      isMounted = false;
    };
  }, [record.buyerUserId]);

  const displayName = fetchedName || (record.buyerName && record.buyerName !== 'Unknown' 
    ? record.buyerName 
    : `User ${record.buyerUserId}`);

  if (record.buyerUserId === 'Unknown') {
    return <span className="text-slate-500">Unknown</span>;
  }

  return (
    <a 
      href={`https://www.roblox.com/users/${record.buyerUserId}/profile`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center space-x-3 hover:bg-[var(--border-subtle)] p-1.5 -ml-1.5 rounded-lg transition-colors group w-max"
    >
      {headshotUrl ? (
        <img 
          src={headshotUrl} 
          alt={displayName} 
          className="w-8 h-8 rounded-full bg-[var(--bg-base)] border border-[var(--border-subtle)] object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[var(--border-subtle)] animate-pulse border border-[var(--border-subtle)]"></div>
      )}
      <span className="font-medium text-slate-300 group-hover:text-primary-400 transition-colors text-sm">
        {displayName}
      </span>
    </a>
  );
}
