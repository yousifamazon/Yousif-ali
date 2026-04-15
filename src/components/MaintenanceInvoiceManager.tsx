import React, { useState, useMemo } from 'react';
import { MaintenanceInvoice, MaintenanceItem } from '../types';
import { Plus, Trash2, Printer, Save, FileText } from 'lucide-react';
import { Button } from './Button';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface Props {
  invoices: MaintenanceInvoice[];
  onSave: (invoice: MaintenanceInvoice) => void;
  onDelete: (id: string) => void;
}

export const MaintenanceInvoiceManager: React.FC<Props> = ({ invoices, onSave, onDelete }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<MaintenanceInvoice | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [cashPaid, setCashPaid] = useState(0);
  const [debtAmount, setDebtAmount] = useState(0);
  const [technicianName, setTechnicianName] = useState('');
  const [warranty, setWarranty] = useState('');
  const [notes, setNotes] = useState('');
  const [receivedFromFactory, setReceivedFromFactory] = useState(0);

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
  const totalAfterDiscount = totalAmount - discount;
  const remainingBalance = totalAfterDiscount - cashPaid - debtAmount;
  
  const factoryOwesMe = totalAfterDiscount > receivedFromFactory ? totalAfterDiscount - receivedFromFactory : 0;
  const iOweFactory = receivedFromFactory > totalAfterDiscount ? receivedFromFactory - totalAfterDiscount : 0;

  const handleAddItem = () => {
    setItems([...items, { id: crypto.randomUUID(), name: '', unit: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleItemChange = (id: string, field: keyof MaintenanceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = () => {
    const newInvoice: MaintenanceInvoice = {
      id: editingInvoice?.id || crypto.randomUUID(),
      invoiceNumber,
      date,
      customerName,
      mobile,
      deviceInfo,
      items,
      totalAmount,
      discount,
      totalAfterDiscount,
      cashPaid,
      debtAmount,
      remainingBalance,
      technicianName,
      warranty,
      notes,
      receivedFromFactory,
      factoryOwesMe,
      iOweFactory,
      createdAt: editingInvoice?.createdAt || new Date().toISOString(),
      userId: editingInvoice?.userId
    };
    onSave(newInvoice);
    setIsCreating(false);
    setEditingInvoice(null);
    resetForm();
  };

  const resetForm = () => {
    setInvoiceNumber('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setCustomerName('');
    setMobile('');
    setDeviceInfo('');
    setItems([]);
    setDiscount(0);
    setCashPaid(0);
    setDebtAmount(0);
    setTechnicianName('');
    setWarranty('');
    setNotes('');
    setReceivedFromFactory(0);
  };

  const handleEdit = (invoice: MaintenanceInvoice) => {
    setEditingInvoice(invoice);
    setInvoiceNumber(invoice.invoiceNumber);
    setDate(invoice.date);
    setCustomerName(invoice.customerName);
    setMobile(invoice.mobile);
    setDeviceInfo(invoice.deviceInfo);
    setItems(invoice.items);
    setDiscount(invoice.discount);
    setCashPaid(invoice.cashPaid);
    setDebtAmount(invoice.debtAmount);
    setTechnicianName(invoice.technicianName);
    setWarranty(invoice.warranty);
    setNotes(invoice.notes);
    setReceivedFromFactory(invoice.receivedFromFactory);
    setIsCreating(true);
  };

  const handlePrint = (invoice: MaintenanceInvoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = invoice.items.map(item => `
      <tr>
          <td>${item.total.toLocaleString()}</td>
          <td>${item.unitPrice.toLocaleString()}</td>
          <td>${item.quantity}</td>
          <td>${item.unit}</td>
          <td class="desc-column">${item.name}</td>
          <td>-</td>
      </tr>
    `).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="ckb" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>کلێشەی پرینتی وەسڵ - سیانە و پارچە</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; background-color: #555; padding: 20px; font-size: 13px; }
        .invoice-paper { background-color: #fff; padding: 20px; width: 148mm; min-height: 210mm; margin-left: auto; margin-right: auto; box-sizing: border-box; color: #000; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .header-text { width: 33%; line-height: 1.2; font-size: 12px; }
        .header-logo { width: 34%; text-align: center; display: flex; flex-direction: column; align-items: center;}
        .header h3 { margin: 0; font-size: 20px; font-weight: bold; color: #222;}
        .header p { margin: 3px 0; font-size: 13px; font-weight: bold;}
        .invoice-title-container { border-bottom: 1px solid #000; margin-bottom: 15px; padding-bottom: 10px;}
        .invoice-title { background-color: #e0e0e0; padding: 3px 15px; font-weight: bold; border: 1px solid #000; width: fit-content; margin-top: 5px; font-size: 14px; }
        .info-container { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .info-box { border: 1px solid #000; padding: 5px 10px; width: 47%; border-radius: 5px; line-height: 1.6; }
        .gray-bg { background-color: #e0e0e0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; text-align: center; font-size: 12px; }
        table, th, td { border: 1px solid #000; }
        th { background-color: #f0f0f0; padding: 6px; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
        td { padding: 4px; height: 25px; } 
        .desc-column { width: 45%; text-align: right; padding-right: 8px !important;}
        .bottom-section { display: flex; justify-content: space-between; align-items: flex-start; font-size: 12px; }
        .totals-details { width: 45%; border: 1px solid #000; }
        .totals-details div { display: flex; justify-content: space-between; padding: 4px 6px; border-bottom: 1px solid #000; }
        .totals-details div:last-child { border-bottom: none; }
        .totals-details .bold-total { background-color: #e0e0e0; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
        .payment-details { width: 45%; border: 1px solid #000; border-radius: 5px; overflow: hidden; }
        .payment-title { text-align: center; background: #e0e0e0; padding: 4px; border-bottom: 1px solid #000; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
        .payment-details div { display: flex; justify-content: space-between; padding: 4px 6px; min-height: 20px;}
        .footer-notes { margin-top: 15px; font-size: 12px;}
        .notes-box { border: 1px solid #000; background-color: #e0e0e0; width: 180px; float: left; text-align: right; border-radius: 5px; overflow: hidden; min-height: 60px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .notes-title { background:#222; color:#fff; text-align:center; padding:3px; font-weight:bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
        .notes-content { padding: 5px; text-align: right; }
        .signatures { clear: both; padding-top: 40px; display: flex; justify-content: space-between; font-size: 12px;}
        @media print {
            body { background-color: #fff; padding: 0; margin: 0; }
            .invoice-paper { width: 100%; margin: 0; padding: 10px; box-shadow: none; border: none; }
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @page { size: A5 portrait; margin: 0; }
    </style>
</head>
<body>
    <div class="invoice-paper">
        <div class="header">
            <div class="header-text" style="text-align: right;">
                <h3>خەرجی کارگە</h3>
            </div>
            <div class="header-logo">
                <svg width="55" height="55" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#333" d="M62.3,28.4l-4.7-0.7c-0.4-1.9-1.1-3.8-2-5.5l2.9-3.8c1-1.3,0.8-3.2-0.4-4.4L53.7,9.5c-1.2-1.2-3.1-1.4-4.4-0.4l-3.8,2.9 c-1.7-1-3.5-1.7-5.5-2l-0.7-4.7C39,3.1,37.1,1.5,34.9,1.5h-5.8c-2.2,0-4.1,1.6-4.4,3.8l-0.7,4.7c-1.9,0.4-3.8,1.1-5.5,2l-3.8-2.9 c-1.3-1-3.2-0.8-4.4,0.4L5.9,14c-1.2,1.2-1.4,3.1-0.4,4.4l2.9,3.8c-1,1.7-1.7,3.5-2,5.5l-4.7,0.7C-0.5,28.6-2,30.6-2,32.8v5.8 c0,2.2,1.6,4.1,3.8,4.4l4.7,0.7c0.4,1.9,1.1,3.8,2,5.5l-2.9,3.8c-1,1.3-0.8,3.2,0.4,4.4l4.4,4.4c1.2,1.2,3.1,1.4,4.4,0.4l3.8-2.9 c1.7,1,3.5,1.7,5.5,2l0.7,4.7c0.3,2.2,2.2,3.8,4.4,3.8h5.8c2.2,0,4.1-1.6,4.4-3.8l0.7-4.7c1.9-0.4,3.8-1.1,5.5-2l3.8,2.9 c1.3,1,3.2,0.8,4.4-0.4l4.4-4.4c1.2-1.2,1.4-3.1,0.4-4.4l-2.9-3.8c1-1.7,1.7-3.5,2-5.5l4.7-0.7c2.2-0.3,3.8-2.2,3.8-4.4v-5.8 C64.1,30.6,62.5,28.6,62.3,28.4z M32,46.5c-8,0-14.5-6.5-14.5-14.5S24,17.5,32,17.5S46.5,24,46.5,32S40,46.5,32,46.5z"/>
                    <path fill="#fff" d="M44.7,19.5c-1.9-1.9-4.8-2.3-7.1-1.1L24.1,31.9c-1.5-0.3-3.2,0.1-4.3,1.3c-1.8,1.8-1.8,4.7,0,6.5c1.8,1.8,4.7,1.8,6.5,0 c1.2-1.2,1.6-2.8,1.3-4.3L41.1,21.9C42.4,24.3,46.6,21.4,44.7,19.5z"/>
                </svg>
                <p style="font-family: 'Arial Black', sans-serif; font-size: 11px; letter-spacing: 1px; color: #333; margin-top: 5px;">MAINTENANCE</p>
            </div>
            <div class="header-text" style="text-align: left;">
                <p style="direction: rtl; font-size: 13px; margin-bottom: 5px;">ژمارەی مۆبایل:</p>
                <p style="direction: ltr; font-size: 13px;">0750 994 9094</p>
                <p style="direction: ltr; font-size: 13px;">0750 726 6362</p>
            </div>
        </div>

        <div class="invoice-title-container">
            <div class="invoice-title">ڕقم <span>${invoice.invoiceNumber}</span></div>
        </div>

        <div class="info-container">
            <div class="info-box">
                <div><strong>پسوولەی کاری سیانە و پارچە</strong></div>
                <div>ڕێکەوت: <span>${invoice.date}</span></div>
                <div>کۆپی: بنەڕەت (ئەسڵی)</div>
            </div>
            <div class="info-box" style="border:none; padding:0;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #000; padding-bottom:5px;">
                    <div>ناوی کڕیار: <strong>${invoice.customerName}</strong></div>
                    <div>مۆبایل: <span>${invoice.mobile}</span></div>
                </div>
                <div style="display:flex; justify-content:space-between; padding-top:5px;">
                    <div>زانیاری ئامێر / کار: <strong>${invoice.deviceInfo}</strong></div>
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>کۆی گشتی</th>
                    <th>نرخی تاک</th>
                    <th>بڕ</th>
                    <th>یەکە</th>
                    <th class="desc-column">وردەکارییەکان (ناوی پارچە / جۆری کار)</th>
                    <th>ژمارە</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="bottom-section">
            <div class="totals-details">
                <div><span>کۆی گشتی:</span> <span>${invoice.totalAmount.toLocaleString()}</span></div>
                <div><span>بڕی داشکاندن:</span> <span>${invoice.discount.toLocaleString()}</span></div>
                <div><span>بڕ دوای داشکاندن:</span> <span>${invoice.totalAfterDiscount.toLocaleString()}</span></div>
                <div class="bold-total"><span>کۆی گشتیی پسوولە:</span> <strong>${invoice.totalAfterDiscount.toLocaleString()}</strong></div>
                <div style="text-align:center; font-size:11px; border:none; display:block; padding-top:10px; min-height:15px;">
                </div>
            </div>

            <div class="payment-details">
                <div class="payment-title">تفاصيل الدفع (وردەکاری پارەدان)</div>
                <div><span>نەقد (کاش):</span> <strong class="gray-bg" style="padding:0 15px;">${invoice.cashPaid.toLocaleString()}</strong></div>
                <div><span>لەسەر حیساب (قەرز):</span> <span>${invoice.debtAmount.toLocaleString()}</span></div>
                <div><span>باڵانسی ماوە:</span> <span>${invoice.remainingBalance.toLocaleString()}</span></div>
            </div>
        </div>

        <div class="footer-notes">
            <p style="float: right;">
                <strong>ناوی تەکنیکار:</strong> <span>${invoice.technicianName}</span><br>
                <strong>گەرەنتی (ضمان):</strong> <span>${invoice.warranty}</span>
            </p>
            
            <div class="notes-box">
                <div class="notes-title">ملاحظات (تێبینی)</div>
                <div class="notes-content">
                    ${invoice.notes}
                </div>
            </div>
        </div>

        <div class="signatures">
            <p><strong>واژووی کڕیار (المستلم):</strong> .....................................</p>
            <p><strong>واژووی سەرپەرشتیار:</strong> .....................................</p>
        </div>
    </div>
    <script>
      window.onload = () => {
        window.print();
      };
    </script>
</body>
</html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[var(--text-main)]">
            {editingInvoice ? 'دەستکاریکردنی وەسڵ' : 'وەسڵێکی نوێ'}
          </h2>
          <Button variant="secondary" onClick={() => { setIsCreating(false); resetForm(); }}>گەڕانەوە</Button>
        </div>

        <div className="bg-[var(--bg-card)] rounded-3xl p-6 shadow-sm border border-[var(--border-color)] space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">ژمارەی وەسڵ</label>
              <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">ڕێکەوت</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">ناوی کڕیار / کارگە</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">مۆبایل</label>
              <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">زانیاری ئامێر / کار</label>
              <input type="text" value={deviceInfo} onChange={e => setDeviceInfo(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)]" />
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-main)]">پارچەکان و کارەکان</h3>
              <Button variant="secondary" size="sm" onClick={handleAddItem} className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> زیادکردن
              </Button>
            </div>
            
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="flex flex-wrap gap-2 items-end bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-[var(--text-muted)] mb-1">ناوی پارچە / جۆری کار</label>
                    <input type="text" value={item.name} onChange={e => handleItemChange(item.id, 'name', e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]" />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-[var(--text-muted)] mb-1">یەکە</label>
                    <input type="text" value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]" />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-[var(--text-muted)] mb-1">بڕ</label>
                    <input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]" />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-[var(--text-muted)] mb-1">نرخی تاک</label>
                    <input type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', Number(e.target.value))} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]" />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-[var(--text-muted)] mb-1">کۆی گشتی</label>
                    <div className="px-3 py-2 text-[var(--text-main)] font-bold">{item.total.toLocaleString()}</div>
                  </div>
                  <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">بڕی داشکاندن</label>
                <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">نەقد (کاش)</label>
                <input type="number" value={cashPaid} onChange={e => setCashPaid(Number(e.target.value))} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">لەسەر حیساب (قەرز)</label>
                <input type="number" value={debtAmount} onChange={e => setDebtAmount(Number(e.target.value))} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)]" />
              </div>
            </div>
            
            <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)] space-y-2">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>کۆی گشتی:</span>
                <span>{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>بڕ دوای داشکاندن:</span>
                <span>{totalAfterDiscount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-[var(--text-main)] text-lg pt-2 border-t border-[var(--border-color)]">
                <span>باڵانسی ماوە:</span>
                <span>{remainingBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] pt-6 space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-main)]">حیساباتی کارگە (تایبەت بە خۆت)</h3>
            <p className="text-sm text-[var(--text-muted)]">ئەم بەشە لە وەسڵەکە دەرناکەوێت، تەنها بۆ ئەوەیە بزانیت چەند پارەی خۆتت سەرف کردووە یان چەندت لە کارگە وەرگرتووە.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">بڕی وەرگیراو لە کارگە بۆ ئەم کارە</label>
                <input type="number" value={receivedFromFactory} onChange={e => setReceivedFromFactory(Number(e.target.value))} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)]" />
              </div>
              <div className="flex flex-col justify-center space-y-2">
                {factoryOwesMe > 0 && (
                  <div className="text-red-500 font-bold bg-red-50 dark:bg-red-500/10 p-3 rounded-xl">
                    کارگە قەرزاری منە: {factoryOwesMe.toLocaleString()}
                  </div>
                )}
                {iOweFactory > 0 && (
                  <div className="text-green-500 font-bold bg-green-50 dark:bg-green-500/10 p-3 rounded-xl">
                    من قەرزاری کارگەم: {iOweFactory.toLocaleString()}
                  </div>
                )}
                {factoryOwesMe === 0 && iOweFactory === 0 && (
                  <div className="text-blue-500 font-bold bg-blue-50 dark:bg-blue-500/10 p-3 rounded-xl">
                    حیسابات سافە
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">ناوی تەکنیکار</label>
              <input type="text" value={technicianName} onChange={e => setTechnicianName(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">گەرەنتی (ضمان)</label>
              <input type="text" value={warranty} onChange={e => setWarranty(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">تێبینی</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] min-h-[100px]" />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button variant="primary" onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-5 h-5" /> پاشەکەوتکردن
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">وەسڵەکانی سیانە</h2>
        <Button variant="primary" onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="w-5 h-5" /> وەسڵی نوێ
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {invoices.map(invoice => (
          <motion.div 
            key={invoice.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-card)] rounded-3xl p-6 shadow-sm border border-[var(--border-color)] space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-[var(--text-main)]">{invoice.customerName || 'بێ ناو'}</h3>
                <p className="text-sm text-[var(--text-muted)]">{invoice.date} - ڕقم: {invoice.invoiceNumber}</p>
              </div>
              <div className="text-left">
                <p className="font-bold text-blue-600 dark:text-blue-400">{invoice.totalAfterDiscount.toLocaleString()} د.ع</p>
              </div>
            </div>
            
            <div className="text-sm text-[var(--text-muted)] line-clamp-2">
              {invoice.deviceInfo}
            </div>

            {(invoice.factoryOwesMe > 0 || invoice.iOweFactory > 0) && (
              <div className="text-xs font-bold p-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
                {invoice.factoryOwesMe > 0 ? (
                  <span className="text-red-500">کارگە قەرزاری منە: {invoice.factoryOwesMe.toLocaleString()}</span>
                ) : (
                  <span className="text-green-500">من قەرزاری کارگەم: {invoice.iOweFactory.toLocaleString()}</span>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-[var(--border-color)]">
              <Button variant="secondary" size="sm" onClick={() => handleEdit(invoice)} className="flex-1 flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" /> بینین
              </Button>
              <Button variant="primary" size="sm" onClick={() => handlePrint(invoice)} className="flex-1 flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> پرینت
              </Button>
              <button onClick={() => onDelete(invoice.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
        {invoices.length === 0 && (
          <div className="col-span-full text-center py-12 text-[var(--text-muted)]">
            هیچ وەسڵێک نییە.
          </div>
        )}
      </div>
    </div>
  );
};
