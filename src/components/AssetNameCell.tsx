import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SaleRecord } from '../types';
import { ExternalLink, LineChart, ChevronDown } from 'lucide-react';
import { ItemDetailModal } from './ItemDetailModal';

interface AssetNameCellProps {
  record: SaleRecord;
  data: SaleRecord[];
}

export function AssetNameCell({ record, data }: AssetNameCellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const hasId = !!record.assetId && record.assetId !== 'Null';
  const robloxUrl = hasId ? `https://www.roblox.com/catalog/${record.assetId}` : null;

  const openMenu = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 220;
      let left = rect.left;
      // Keep menu within the viewport horizontally
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      setMenuPos({ top: rect.bottom + 6, left });
    }
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('click', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('click', close);
    };
  }, [menuOpen]);

  const menu = menuOpen
    ? createPortal(
        <div
          className="fixed z-[110] w-[220px] bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150"
          style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
          onClick={e => e.stopPropagation()}
        >
          {robloxUrl && (
            <a
              href={robloxUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-[var(--border-subtle)] hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span>Open Roblox page</span>
            </a>
          )}
          <button
            onClick={() => {
              setMenuOpen(false);
              setShowModal(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-[var(--border-subtle)] hover:text-white transition-colors text-left"
          >
            <LineChart className="w-4 h-4 text-primary-400 flex-shrink-0" />
            <span>View sales chart</span>
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={e => {
          e.stopPropagation();
          openMenu();
        }}
        className="group/asset inline-flex items-center gap-1 font-medium text-slate-200 hover:text-primary-400 transition-colors text-left max-w-full"
        title={record.assetName}
      >
        <span className="hover:underline truncate">{record.assetName}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/asset:opacity-60 transition-opacity flex-shrink-0" />
      </button>

      {menu}

      {showModal && (
        <ItemDetailModal
          assetId={record.assetId}
          assetName={record.assetName}
          assetType={record.assetType}
          data={data}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
