
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }

  // Extract headers from the first object
  const headers = Object.keys(data[0]);

  // Convert data to CSV format
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(fieldName => {
        // @ts-ignore
        let value = row[fieldName];
        // Handle null/undefined
        if (value === null || value === undefined) value = '';
        // Convert to string and escape quotes if necessary
        const stringValue = String(value).replace(/"/g, '""'); 
        // Wrap in quotes to handle commas and newlines within data
        return `"${stringValue}"`;
      }).join(',')
    )
  ].join('\r\n');

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
