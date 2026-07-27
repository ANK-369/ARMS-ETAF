
import { AppData, Manpower, IncomeItem, Subsidy, Transfer, Expense, Refund } from '../types';
import { saveDB, getDB, smartUpsertItem } from './db';

export const downloadFile = (content: string, filename: string, type: 'csv' | 'json' | 'doc') => {
  let mimeType = 'text/plain';
  let extension = '';
  if (type === 'csv') { mimeType = 'text/csv;charset=utf-8;'; extension = '.csv'; } 
  else if (type === 'json') { mimeType = 'application/json'; extension = '.json'; } 
  else if (type === 'doc') { mimeType = 'application/msword'; extension = '.doc'; }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename + extension;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateCSV = (data: any[]) => {
  if (!data || !data.length) return '';
  const headers = Object.keys(data[0]);
  return [
    headers.join(','),
    ...data.map(row => headers.map(fieldName => {
        // @ts-ignore
        let val = row[fieldName];
        if (val === null || undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(','))
  ].join('\r\n');
};

export const generateHTMLDoc = (title: string, data: any[], customHtml?: string) => {
  let bodyContent = '';
  if (customHtml) {
    bodyContent = customHtml;
  } else if (data && data.length > 0) {
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
        `<tr>${headers.map(h => `<td style="border:1px solid #000; padding:5px;">${// @ts-ignore
        row[h]}</td>`).join('')}</tr>`
    ).join('');
    bodyContent = `<table border="1" cellpadding="5" cellspacing="0" width="100%"><thead><tr>${headers.map(h => `<th>${h.toUpperCase()}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  } else {
    bodyContent = '<p>No Data</p>';
  }

  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
      <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page { size: A4; margin: 25mm; mso-page-orientation: portrait; }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; }
        table { border-collapse: collapse; width: 100%; mso-border-alt: solid windowtext .5pt; }
        td, th { border: 1px solid black; padding: 5px; mso-border-alt: solid windowtext .5pt; }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
  `;
};

const VALIDATION_SCHEMAS: Record<keyof AppData, string[]> = {
  manpower: ['firstName', 'rank', 'type'],
  incomeItems: ['name', 'singlePrice'], 
  subsidies: ['source', 'type', 'amount'],
  transfers: ['dateFrom', 'dateTo'],
  expenses: ['category', 'amount'], 
  refunds: ['stopDate', 'rank', 'firstName'], 
  notes: ['title', 'content', 'timestamp'],
  storeItems: ['name', 'category'],
  storeOrders: ['itemName', 'status'],
  foodProgram: ['day', 'breakfast'],
  foodProgramArchive: ['archivedDate', 'name'],
  programSettings: ['title', 'subtitle'],
  mealIngredients: [],
  rationHistory: ['dateExecuted', 'day'],
  securityCredentials: [],
  secretKey: []
};

export const mergeData = (section: keyof AppData, newData: any[], onSuccess: (count: number) => void, onError: (msg: string) => void) => {
  try {
    const requiredKeys = VALIDATION_SCHEMAS[section];
    if (requiredKeys && requiredKeys.length > 0 && newData.length > 0) {
      const firstItem = newData[0];
      const missingKeys = requiredKeys.filter(key => !(key in firstItem));
      if (missingKeys.length > 0) {
        onError(`Structure Mismatch! Missing: ${missingKeys.join(', ')}`);
        return;
      }
    }
    
    // USE SMART UPSERT FOR EACH ITEM
    // This ensures that even file imports go through strict duplicate checking and merging
    let processedCount = 0;
    
    newData.forEach(item => {
        // Clean ID to ensure new generation if colliding, or let smartUpsert handle it
        // Ideally, for imports, we ignore ID and match by Content (Names)
        const itemToProcess = { ...item };
        if (itemToProcess.id) delete itemToProcess.id; // Remove ID to force content-based match
        
        smartUpsertItem(section, itemToProcess);
        processedCount++;
    });

    if (processedCount > 0) {
      onSuccess(processedCount);
    } else {
      onError("No valid data processed.");
    }
  } catch (e) {
    console.log(String(e));
    onError("Failed to merge data.");
  }
};

export const parseImportFile = (file: File, callback: (data: any) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = (e.target?.result as string).replace(/^\uFEFF/, '');
    const name = file.name.toLowerCase();

    if (name.endsWith('.json')) {
      try { 
        const json = JSON.parse(text); 
        callback(json); 
      } catch (err) { 
        console.error("JSON Parse Error", err instanceof Error ? err.message : String(err));
        callback(null); 
      }
    } else if (name.endsWith('.csv')) {
      try {
        const lines = text.split(/\r\n|\n/);
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            let obj: any = {};
            for (let j = 0; j < headers.length; j++) {
            let val = currentline[j] ? currentline[j].replace(/"/g, '').trim() : '';
            if (!isNaN(Number(val)) && val !== '') { obj[headers[j]] = Number(val); } else { obj[headers[j]] = val; }
            }
            result.push(obj);
        }
        callback(result);
      } catch (err) {
        console.error("CSV Parse Error", err instanceof Error ? err.message : String(err));
        callback(null);
      }
    } else {
        console.error("Unknown file extension");
        callback(null);
    }
  };
  reader.onerror = () => {
      callback(null);
  };
  reader.readAsText(file);
};
