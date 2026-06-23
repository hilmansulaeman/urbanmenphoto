const TRANSACTIONS_KEY = 'potobox_transactions';

export function logTransaction({ orderId, packageName, amount, method = 'QRIS', status = 'Success' }) {
  try {
    const existingStr = localStorage.getItem(TRANSACTIONS_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : [];
    
    const newTransaction = {
      id: orderId || `ORD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      packageName: packageName || 'Unknown Package',
      amount: amount || 0,
      method,
      status
    };
    
    existing.unshift(newTransaction); // Add to beginning (newest first)
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(existing));
    return true;
  } catch (error) {
    console.error('Failed to log transaction:', error);
    return false;
  }
}

export function getTransactions() {
  try {
    const existingStr = localStorage.getItem(TRANSACTIONS_KEY);
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (error) {
    console.error('Failed to read transactions:', error);
    return [];
  }
}

export function clearTransactions() {
  try {
    localStorage.removeItem(TRANSACTIONS_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear transactions:', error);
    return false;
  }
}

export function exportTransactionsToCSV() {
  const transactions = getTransactions();
  if (transactions.length === 0) {
    alert('Tidak ada transaksi untuk diekspor.');
    return;
  }

  // Define CSV headers
  const headers = ['Order ID', 'Tanggal', 'Waktu', 'Nama Paket', 'Jumlah (Rp)', 'Metode', 'Status'];
  
  // Format rows
  const rows = transactions.map(t => {
    const dateObj = new Date(t.timestamp);
    const dateStr = dateObj.toLocaleDateString('id-ID');
    const timeStr = dateObj.toLocaleTimeString('id-ID');
    return [
      t.id,
      dateStr,
      timeStr,
      t.packageName,
      t.amount,
      t.method,
      t.status
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `potobox_transactions_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
