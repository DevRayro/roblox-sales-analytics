import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SaleRecord } from '../types';
import { HelpCircle, ExternalLink } from 'lucide-react';
import { gameIconBatcher, placeIconBatcher, gameNameBatcher } from '../utils/apiBatcher';

interface LocationCellProps {
  record: SaleRecord;
}

export function LocationCell({ record }: LocationCellProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [gameName, setGameName] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const isGame = record.location === 'Game';
  const hasUniverse = record.universeId && record.universeId !== 'Null' && record.universeId !== '';
  const hasLocation = record.locationId && record.locationId !== 'Null' && record.locationId !== '';

  const canFetchIcon = isGame && (hasUniverse || hasLocation);

  useEffect(() => {
    if (!canFetchIcon) return;

    let isMounted = true;

    const idToUse = hasUniverse ? record.universeId : record.locationId;
    const iconBatcher = hasUniverse ? gameIconBatcher : placeIconBatcher;

    iconBatcher.fetch(idToUse)
      .then(url => {
        if (isMounted && url) setIconUrl(url);
      })
      .catch(err => console.error('Failed to fetch game icon', err));

    // If we don't have the universe name, try to fetch it if we have the universeId
    if ((!record.universe || record.universe === 'Unknown' || record.universe === 'Null') && hasUniverse) {
      gameNameBatcher.fetch(record.universeId)
        .then(name => {
          if (isMounted && name) setGameName(name);
        })
        .catch(err => console.error('Failed to fetch game name', err));
    }

    return () => {
      isMounted = false;
    };
  }, [canFetchIcon, hasUniverse, record.universeId, record.locationId, record.universe]);

  const handleMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top + rect.height / 2, // center vertically
        left: rect.right + 12 // 12px spacing to the right
      });
    }
    setIsHovering(true);
  };

  const linkUrl = hasUniverse
    ? `https://www.roblox.com/games/${record.universeId}`
    : hasLocation
      ? `https://www.roblox.com/games/${record.locationId}`
      : null;

  const displayGameName = gameName || (record.universe && record.universe !== 'Null' && record.universe !== 'Unknown' ? record.universe : 'Game');

  const badge = (
    <span
      className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 w-fit transition-all ${
        isGame
          ? `bg-primary-500/10 text-primary-400 border border-primary-500/20 ${linkUrl ? 'cursor-pointer hover:bg-primary-500/20 hover:border-primary-500/30 hover:shadow-sm' : 'cursor-default'}`
          : record.location === 'Website'
            ? 'bg-[var(--border-subtle)] text-slate-300 border border-[var(--border-subtle)] cursor-default'
            : 'bg-[var(--bg-base)] text-slate-400 border border-[var(--border-subtle)] cursor-default'
      }`}
    >
      <span className="truncate max-w-[120px]">{isGame ? displayGameName : (record.location || 'Unknown')}</span>
      {isGame && linkUrl && <ExternalLink className="w-3 h-3 opacity-50" />}
    </span>
  );

  if (!isGame) {
    return badge;
  }

  const tooltip = isHovering ? createPortal(
    <div
      className="fixed z-[100] w-64 bg-[var(--bg-panel)] rounded-xl shadow-xl border border-[var(--border-subtle)] p-4 animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: `${tooltipPos.top}px`,
        left: `${tooltipPos.left}px`,
        transform: 'translate(0, -50%)'
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Tooltip Arrow pointing left */}
      <div
        className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-[var(--bg-panel)] border-l border-b border-[var(--border-subtle)] transform rotate-45"
      ></div>

      <div className="relative z-10">
        {linkUrl ? (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center text-center group"
          >
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={displayGameName}
                className="w-24 h-24 rounded-xl mb-4 shadow-sm border border-[var(--border-subtle)] group-hover:shadow-md group-hover:scale-105 transition-all duration-300 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] mb-4 flex items-center justify-center animate-pulse">
                <div className="w-8 h-8 rounded-full bg-[var(--border-subtle)]"></div>
              </div>
            )}
            <span className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors line-clamp-2 mb-1.5">
              {displayGameName}
            </span>
            <span className="text-xs text-slate-400 group-hover:text-primary-400 flex items-center gap-1.5 font-medium bg-[var(--bg-base)] px-2 py-1 rounded-md border border-[var(--border-subtle)] group-hover:border-primary-500/20 group-hover:bg-primary-500/10 transition-colors">
              View on Roblox <ExternalLink className="w-3 h-3" />
            </span>
          </a>
        ) : (
          <div className="flex flex-col items-center text-center text-slate-400">
            <div className="w-24 h-24 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] mb-4 flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-slate-500" />
            </div>
            <span className="text-sm font-bold text-slate-300 mb-1">{displayGameName}</span>
            <span className="text-xs mt-1 text-slate-500 bg-[var(--bg-base)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">No place ID provided</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovering(false)}
      onClick={() => {
        if (linkUrl) window.open(linkUrl, '_blank', 'noopener,noreferrer');
      }}
    >
      {badge}
      {tooltip}
    </div>
  );
}
