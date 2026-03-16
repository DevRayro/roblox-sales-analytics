import React, { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import Papa from 'papaparse';
import { SaleRecord } from '../types';

interface FileUploadProps {
  onDataParsed: (data: SaleRecord[]) => void;
}

export function FileUpload({ onDataParsed }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const parseFile = (file: File) => {
    setError(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const salesData = results.data.filter((row: any) => {
            // Some CSVs have 'Action', some have 'Type'. If neither exists, we assume it's a sale.
            const action = row['Action'] || row['Type'];
            return !action || action === 'Sale';
          });

          const parsedData: SaleRecord[] = salesData.map((row: any) => ({
            id: row['Id'] || row['Transaction ID'] || `csv-${Date.now()}-${Math.random()}`,
            buyerUserId: row['Buyer User Id'] || row['Buyer User ID'],
            buyerName: row['Buyer Name'] || undefined,
            dateTime: new Date(row['Date and Time'] || row['Date']),
            location: row['Location'],
            locationId: row['Location Id'] || row['Location ID'],
            universeId: row['Universe Id'] || row['Universe ID'],
            universe: row['Universe'],
            assetId: row['Asset Id'] || row['Asset ID'],
            assetName: row['Asset Name'] || row['Item Name'],
            assetType: row['Asset Type'] || row['Item Type'],
            holdStatus: row['Hold Status'],
            revenue: parseFloat(row['Revenue']?.toString().replace(/,/g, '')) || 0,
            price: parseFloat(row['Price']?.toString().replace(/,/g, '')) || undefined,
          }));
          onDataParsed(parsedData);
        } catch (err) {
          console.error(err);
          setError('Failed to parse CSV. Please ensure it is a valid Roblox sales CSV.');
        }
      },
      error: (err) => {
        setError(err.message);
      },
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        parseFile(file);
      } else {
        setError('Please upload a valid CSV file.');
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 ${
          isDragging ? 'border-primary-500 bg-primary-500/10 scale-[1.02]' : 'border-[var(--border-subtle)] hover:border-primary-400/50 hover:bg-[var(--border-subtle)]/50 bg-[var(--bg-panel)] shadow-sm'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-primary-500/20">
          <UploadCloud className="w-8 h-8 text-primary-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Upload Sales Data</h3>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">Drag and drop your Roblox sales CSV file here, or click to browse your files.</p>
        
        <label className="bg-primary-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-primary-500 cursor-pointer transition-all shadow-sm hover:shadow-md inline-block">
          Select CSV File
          <input type="file" className="hidden" accept=".csv,text/csv" onChange={handleFileInput} />
        </label>
        
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
