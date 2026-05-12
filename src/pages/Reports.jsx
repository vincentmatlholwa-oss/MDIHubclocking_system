import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { STORES } from '../utils/constants';
import { getAll } from '../services/db';
import { formatDisplayDate, formatDisplayTime, formatDate } from '../utils/helpers';

export function Reports() {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('attendance');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [summary, setSummary] = useState(null);

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const allRecords = await getAll(STORES.attendance);
      const allUsers = await getAll(STORES.users);
      setUsers(allUsers);

      const filtered = allRecords.filter(r => {
        return r.date >= dateRange.from && r.date <= dateRange.to;
      }).sort((a, b) => new Date(b.date) - new Date(a.date));

      setRecords(filtered);

      const totalHours = filtered.reduce((sum, r) => sum + (r.totalHours || 0), 0);
      const lateCount = filtered.filter(r => r.late).length;
      const lateEmployees = {};
      filtered.filter(r => r.late).forEach(r => {
        const name = r.employeeName || r.employeeId;
        lateEmployees[name] = (lateEmployees[name] || 0) + 1;
      });

      const uniqueEmployees = new Set(filtered.map(r => r.employeeId)).size;

      setSummary({
        totalRecords: filtered.length,
        totalEmployees: allUsers.filter(u => u.role === 'employee').length,
        activeEmployees: uniqueEmployees,
        totalHours: totalHours,
        avgHoursPerDay: uniqueEmployees > 0 ? (totalHours / uniqueEmployees).toFixed(2) : 0,
        lateCount,
        mostLate: Object.entries(lateEmployees).sort((a, b) => b[1] - a[1]).slice(0, 5)
      });
    } catch (e) {
      console.error('Report error:', e);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { generateReport(); }, [generateReport]);

  const getTableData = () => {
    return records.map(r => [
      formatDisplayDate(new Date(r.date)),
      r.employeeName || r.employeeId,
      r.employeeId,
      r.clockIn ? formatDisplayTime(new Date(r.clockIn)) : '--',
      r.clockOut ? formatDisplayTime(new Date(r.clockOut)) : (r.clockIn ? 'Active' : '--'),
      r.totalHours ? r.totalHours.toFixed(2) : '0.00',
      r.late && !r.lateApproved ? 'Late' : r.clockOut ? 'Present' : r.clockIn ? 'Active' : 'Absent',
      r.location?.address?.split(',')[0] || 'N/A'
    ]);
  };

  const exportExcel = () => {
    const headers = [['Date', 'Employee', 'ID', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Location']];
    const data = headers.concat(getTableData());

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 14 }, { wch: 20 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 8 },
      { wch: 12 }, { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `MDIHub_Report_${dateRange.from}_to_${dateRange.to}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(212, 160, 23);
    doc.text('MDIHub - Attendance Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString('en-ZA')}`, pageWidth / 2, 34, { align: 'center' });

    if (summary) {
      doc.setFontSize(9);
      doc.setTextColor(80);
      const statsY = 42;
      doc.text(`Total Records: ${summary.totalRecords}`, 14, statsY);
      doc.text(`Total Hours: ${summary.totalHours.toFixed(1)}`, 70, statsY);
      doc.text(`Employees: ${summary.totalEmployees}`, 130, statsY);
      doc.text(`Late Arrivals: ${summary.lateCount}`, 190, statsY);
    }

    const headers = [['Date', 'Employee', 'ID', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Location']];
    const bodyData = getTableData();

    doc.autoTable({
      head: headers,
      body: bodyData,
      startY: summary ? 48 : 40,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 42, 78], textColor: [212, 160, 23], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 16 },
        6: { cellWidth: 22 },
        7: { cellWidth: 50 }
      }
    });

    doc.save(`MDIHub_Report_${dateRange.from}_to_${dateRange.to}.pdf`);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Employee', 'ID', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Location'];
    const rows = getTableData();
    const csv = [headers, ...rows].map(row => row.map(cell =>
      typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
        ? `"${cell.replace(/"/g, '""')}"`
        : cell
    ).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MDIHub_Report_${dateRange.from}_to_${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p className="text-muted">Attendance reports and insights</p>
        </div>
        <div className="btn-group">
          <button onClick={exportCSV} className="btn btn-sm btn-outline" disabled={records.length === 0}>CSV</button>
          <button onClick={exportExcel} className="btn btn-sm btn-outline" disabled={records.length === 0}>Excel</button>
          <button onClick={exportPDF} className="btn btn-sm btn-outline" disabled={records.length === 0}>PDF</button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h3>Report Filters</h3>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label>From</label>
              <input type="date" value={dateRange.from}
                onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>To</label>
              <input type="date" value={dateRange.to}
                onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <button onClick={generateReport} className="btn btn-primary">Generate</button>
            </div>
          </div>
        </div>
      </div>

      {summary && (
        <div className="stats-row mb-4">
          <div className="stat-card">
            <div className="stat-number">{summary.totalRecords}</div>
            <div className="stat-label">Records</div>
          </div>
          <div className="stat-card stat-good">
            <div className="stat-number">{summary.activeEmployees}</div>
            <div className="stat-label">Active Employees</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{summary.totalHours.toFixed(1)}</div>
            <div className="stat-label">Total Hours</div>
          </div>
          <div className="stat-card stat-info">
            <div className="stat-number">{summary.avgHoursPerDay}</div>
            <div className="stat-label">Avg Hours/Employee</div>
          </div>
          <div className="stat-card stat-warn">
            <div className="stat-number">{summary.lateCount}</div>
            <div className="stat-label">Late Arrivals</div>
          </div>
        </div>
      )}

      {summary?.mostLate?.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>Most Late Employees</h3>
          </div>
          <div className="card-body p-0">
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Employee</th><th>Late Count</th></tr></thead>
                <tbody>
                  {summary.mostLate.map(([name, count]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td><span className="badge badge-danger">{count}x</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Attendance Records</h3>
          <span className="badge badge-info">{records.length} records</span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-4"><span className="spinner" /></div>
          ) : records.length === 0 ? (
            <div className="empty-state"><p>No records found for selected period</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Date</th><th>Employee</th><th>ID</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Status</th><th>Location</th></tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className={r.late && !r.lateApproved ? 'row-late' : ''}>
                      <td>{formatDisplayDate(new Date(r.date))}</td>
                      <td>{r.employeeName || r.employeeId}</td>
                      <td><code>{r.employeeId}</code></td>
                      <td>{r.clockIn ? formatDisplayTime(new Date(r.clockIn)) : '--'}</td>
                      <td>{r.clockOut ? formatDisplayTime(new Date(r.clockOut)) : (r.clockIn ? <span className="badge badge-warning">Active</span> : '--')}</td>
                      <td>{r.totalHours ? `${r.totalHours.toFixed(2)}h` : '--'}</td>
                      <td>
                        <span className={`badge ${r.late && !r.lateApproved ? 'badge-danger' : r.late && r.lateApproved ? 'badge-warning' : r.clockOut ? 'badge-success' : r.clockIn ? 'badge-warning' : 'badge-secondary'}`}>
                          {r.late && !r.lateApproved ? 'Late (Pending)' : r.late && r.lateApproved ? 'Late (Approved)' : r.clockOut ? 'Present' : r.clockIn ? 'Active' : 'Absent'}
                        </span>
                      </td>
                      <td className="text-truncate" title={r.location?.address}>
                        {r.location?.address?.split(',')[0] || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
