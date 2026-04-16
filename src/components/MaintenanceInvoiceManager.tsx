import React, { useState, useMemo } from 'react';
import { MaintenanceInvoice, MaintenanceItem } from '../types';
import { Plus, Trash2, Printer, Save, FileText, Download, CheckCircle, XCircle, Mic } from 'lucide-react';
import { Button } from './Button';
import { SpeechToTextButton } from '../App';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';

interface Props {
  invoices: MaintenanceInvoice[];
  onSave: (invoice: MaintenanceInvoice) => void;
  onDelete: (id: string) => void;
}

export const MaintenanceInvoiceManager: React.FC<Props> = ({ invoices, onSave, onDelete }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<MaintenanceInvoice | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [title, setTitle] = useState('خەرجی کارگە');
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
      title,
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
    setTitle('خەرجی کارگە');
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
    setTitle(invoice.title || 'خەرجی کارگە');
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

  const handleMarkAsPaid = (invoice: MaintenanceInvoice) => {
    if (window.confirm('دڵنیایت کە پارەی ئەم وەسڵە وەرگیراوە؟')) {
      const updatedInvoice = {
        ...invoice,
        cashPaid: invoice.totalAfterDiscount,
        debtAmount: 0,
        remainingBalance: 0
      };
      onSave(updatedInvoice);
    }
  };

  const handleMarkAsUnpaid = (invoice: MaintenanceInvoice) => {
    if (window.confirm('دڵنیایت لە وەرنەگرتنی ئەم وەسڵە؟ (قەرزەکە دەگەڕێتەوە)')) {
      const updatedInvoice = {
        ...invoice,
        cashPaid: 0,
        debtAmount: invoice.totalAfterDiscount,
        remainingBalance: invoice.totalAfterDiscount
      };
      onSave(updatedInvoice);
    }
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
        .paid-stamp {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-15deg);
            border: 5px solid #4caf50;
            color: #4caf50;
            font-size: 60px;
            font-weight: bold;
            padding: 10px 30px;
            border-radius: 15px;
            opacity: 0.15;
            pointer-events: none;
            z-index: 100;
            white-space: nowrap;
        }
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
        ${invoice.debtAmount === 0 ? '<div class="paid-stamp">وەرگیراوە</div>' : ''}
        <div class="header">
            <div class="header-text" style="text-align: right;">
                <h3>${invoice.title || 'خەرجی کارگە'}</h3>
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
                <div ${invoice.debtAmount > 0 ? 'style="background-color: #ffebee !important; color: #c62828 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;"' : ''}><span>لەسەر حیساب (قەرز):</span> <span>${invoice.debtAmount.toLocaleString()}</span></div>
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

  const handleDownloadImage = async (invoice: MaintenanceInvoice) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    
    const style = document.createElement('style');
    style.innerHTML = `
        .invoice-paper { background-color: #fff; padding: 20px; width: 148mm; min-height: 210mm; box-sizing: border-box; color: #000; direction: rtl; font-family: Arial, Helvetica, sans-serif; font-size: 13px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .header-text { width: 33%; line-height: 1.2; font-size: 12px; }
        .header-logo { width: 34%; text-align: center; display: flex; flex-direction: column; align-items: center;}
        .header h3 { margin: 0; font-size: 20px; font-weight: bold; color: #222;}
        .header p { margin: 3px 0; font-size: 13px; font-weight: bold;}
        .invoice-title-container { border-bottom: 1px solid #000; margin-bottom: 15px; padding-bottom: 10px;}
        .invoice-title { background-color: #e0e0e0; padding: 3px 15px; font-weight: bold; border: 1px solid #000; width: fit-content; margin-top: 5px; font-size: 14px; }
        .info-container { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .info-box { border: 1px solid #000; padding: 5px 10px; width: 47%; border-radius: 5px; line-height: 1.6; }
        .gray-bg { background-color: #e0e0e0 !important; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; text-align: center; font-size: 12px; }
        table, th, td { border: 1px solid #000; }
        th { background-color: #f0f0f0; padding: 6px; font-weight: bold; }
        td { padding: 4px; height: 25px; } 
        .desc-column { width: 45%; text-align: right; padding-right: 8px !important;}
        .bottom-section { display: flex; justify-content: space-between; align-items: flex-start; font-size: 12px; }
        .totals-details { width: 45%; border: 1px solid #000; }
        .totals-details div { display: flex; justify-content: space-between; padding: 4px 6px; border-bottom: 1px solid #000; }
        .totals-details div:last-child { border-bottom: none; }
        .totals-details .bold-total { background-color: #e0e0e0; font-weight: bold; }
        .payment-details { width: 45%; border: 1px solid #000; border-radius: 5px; overflow: hidden; }
        .payment-title { text-align: center; background: #e0e0e0; padding: 4px; border-bottom: 1px solid #000; font-weight: bold; }
        .payment-details div { display: flex; justify-content: space-between; padding: 4px 6px; min-height: 20px;}
        .footer-notes { margin-top: 15px; font-size: 12px;}
        .notes-box { border: 1px solid #000; background-color: #e0e0e0; width: 180px; float: left; text-align: right; border-radius: 5px; overflow: hidden; min-height: 60px; }
        .notes-title { background:#222; color:#fff; text-align:center; padding:3px; font-weight:bold; }
        .notes-content { padding: 5px; text-align: right; }
        .signatures { clear: both; padding-top: 40px; display: flex; justify-content: space-between; font-size: 12px;}
        .paid-stamp {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-15deg);
            border: 5px solid #4caf50;
            color: #4caf50;
            font-size: 60px;
            font-weight: bold;
            padding: 10px 30px;
            border-radius: 15px;
            opacity: 0.15;
            pointer-events: none;
            z-index: 100;
            white-space: nowrap;
        }
    `;
    
    const itemsHtml = invoice.items.map((item, index) => `
      <tr>
          <td>${item.total.toLocaleString()}</td>
          <td>${item.unitPrice.toLocaleString()}</td>
          <td>${item.quantity}</td>
          <td>${item.unit}</td>
          <td class="desc-column">${item.name}</td>
          <td>${index + 1}</td>
      </tr>
    `).join('');

    const invoiceHtml = `
      <div class="invoice-paper" id="invoice-capture-${invoice.id}">
        ${invoice.debtAmount === 0 ? '<div class="paid-stamp">وەرگیراوە</div>' : ''}
        <div class="header">
            <div class="header-text" style="text-align: right;">
                <h3>${invoice.title || 'خەرجی کارگە'}</h3>
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
                <div ${invoice.debtAmount > 0 ? 'style="background-color: #ffebee !important; color: #c62828 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;"' : ''}><span>لەسەر حیساب (قەرز):</span> <span>${invoice.debtAmount.toLocaleString()}</span></div>
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
    `;

    container.appendChild(style);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = invoiceHtml;
    container.appendChild(wrapper);
    document.body.appendChild(container);

    try {
      const element = document.getElementById(`invoice-capture-${invoice.id}`);
      if (element) {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `وەسڵی-سیانە-${invoice.invoiceNumber || invoice.id}.png`;
        link.click();
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('هەڵەیەک ڕوویدا لە کاتی دروستکردنی وێنەکە.');
    } finally {
      document.body.removeChild(container);
    }
  };

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[var(--text-main)]">
            {editingInvoice ? 'دەستکاریکردنی وەسڵ' : 'وەسڵێکی نوێ'}
          </h2>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setIsCreating(false); resetForm(); }}>گەڕانەوە</Button>
            {editingInvoice && (
              <Button variant="secondary" onClick={() => handleDownloadImage(editingInvoice)} className="flex items-center gap-2">
                <Download className="w-5 h-5" /> وێنە
              </Button>
            )}
            <Button variant="primary" onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-5 h-5" /> پاشەکەوتکردن
            </Button>
          </div>
        </div>

        <div className="bg-[#555] p-4 md:p-8 rounded-3xl overflow-auto flex flex-col items-center gap-6">
          <style>{`
            .invoice-paper {
                background-color: #fff;
                padding: 20px;
                width: 148mm; 
                min-height: 210mm; 
                box-sizing: border-box;
                color: #000;
                direction: rtl;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 13px;
            }
            .invoice-paper .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .invoice-paper .header-text { width: 33%; line-height: 1.2; font-size: 12px; }
            .invoice-paper .header-logo { width: 34%; text-align: center; display: flex; flex-direction: column; align-items: center;}
            .invoice-paper .header h3 { margin: 0; font-size: 20px; font-weight: bold; color: #222;}
            .invoice-paper .header p { margin: 3px 0; font-size: 13px; font-weight: bold;}
            .invoice-paper .invoice-title-container { border-bottom: 1px solid #000; margin-bottom: 15px; padding-bottom: 10px; position: relative; }
            .invoice-paper .invoice-title { background-color: #e0e0e0; padding: 3px 15px; font-weight: bold; border: 1px solid #000; width: fit-content; margin-top: 5px; font-size: 14px; display: flex; align-items: center; gap: 5px;}
            .invoice-paper .info-container { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .invoice-paper .info-box { border: 1px solid #000; padding: 5px 10px; width: 47%; border-radius: 5px; line-height: 1.6; }
            .invoice-paper .gray-bg { background-color: #e0e0e0 !important; }
            .invoice-paper table { width: 100%; border-collapse: collapse; margin-bottom: 15px; text-align: center; font-size: 12px; }
            .invoice-paper table, .invoice-paper th, .invoice-paper td { border: 1px solid #000; }
            .invoice-paper th { background-color: #f0f0f0; padding: 6px; font-weight: bold; }
            .invoice-paper td { padding: 4px; height: 25px; } 
            .invoice-paper .desc-column { width: 45%; text-align: right; padding-right: 8px !important;}
            .invoice-paper .bottom-section { display: flex; justify-content: space-between; align-items: flex-start; font-size: 12px; }
            .invoice-paper .totals-details { width: 45%; border: 1px solid #000; }
            .invoice-paper .totals-details div { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; border-bottom: 1px solid #000; }
            .invoice-paper .totals-details div:last-child { border-bottom: none; }
            .invoice-paper .totals-details .bold-total { background-color: #e0e0e0; font-weight: bold; }
            .invoice-paper .payment-details { width: 45%; border: 1px solid #000; border-radius: 5px; overflow: hidden; }
            .invoice-paper .payment-title { text-align: center; background: #e0e0e0; padding: 4px; border-bottom: 1px solid #000; font-weight: bold; }
            .invoice-paper .payment-details div { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; min-height: 20px;}
            .invoice-paper .footer-notes { margin-top: 15px; font-size: 12px;}
            .invoice-paper .notes-box { border: 1px solid #000; background-color: #e0e0e0; width: 180px; float: left; text-align: right; border-radius: 5px; overflow: hidden; min-height: 60px; }
            .invoice-paper .notes-title { background:#222; color:#fff; text-align:center; padding:3px; font-weight:bold; }
            .invoice-paper .notes-content { padding: 5px; text-align: right; }
            .invoice-paper .signatures { clear: both; padding-top: 40px; display: flex; justify-content: space-between; font-size: 12px;}
            
            /* Inputs */
            .inv-input {
              width: 100%;
              border: 1px dashed #999;
              background: rgba(255,255,255,0.8);
              padding: 2px 4px;
              font-family: inherit;
              font-size: inherit;
              color: #000;
              box-sizing: border-box;
              border-radius: 2px;
            }
            .inv-input:focus { border-color: #2196F3; background: #fff; outline: none; }
            .inv-input.inline { width: auto; display: inline-block; }
            .inv-input.num { width: 60px; text-align: center; }
            .inv-input.transparent { border-color: transparent; background: transparent; }
            .inv-input.transparent:hover { border-color: #ccc; }
            .inv-input.transparent:focus { border-color: #2196F3; background: #fff; }
          `}</style>
          
          <div className="invoice-paper shadow-2xl relative">
              {/* Header */}
              <div className="header">
                  <div className="header-text" style={{textAlign: 'right', display: 'flex', alignItems: 'center', gap: '5px'}}>
                      <input type="text" className="inv-input transparent" style={{fontSize: '1.17em', fontWeight: 'bold', textAlign: 'right', width: '100%'}} value={title} onChange={e => setTitle(e.target.value)} placeholder="ناونیشانی وەسڵ..." />
                      <SpeechToTextButton onResult={(text) => setTitle(text)} className="p-1" />
                  </div>
                  <div className="header-logo">
                      <svg width="55" height="55" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                          <path fill="#333" d="M62.3,28.4l-4.7-0.7c-0.4-1.9-1.1-3.8-2-5.5l2.9-3.8c1-1.3,0.8-3.2-0.4-4.4L53.7,9.5c-1.2-1.2-3.1-1.4-4.4-0.4l-3.8,2.9 c-1.7-1-3.5-1.7-5.5-2l-0.7-4.7C39,3.1,37.1,1.5,34.9,1.5h-5.8c-2.2,0-4.1,1.6-4.4,3.8l-0.7,4.7c-1.9,0.4-3.8,1.1-5.5,2l-3.8-2.9 c-1.3-1-3.2-0.8-4.4,0.4L5.9,14c-1.2,1.2-1.4,3.1-0.4,4.4l2.9,3.8c-1,1.7-1.7,3.5-2,5.5l-4.7,0.7C-0.5,28.6-2,30.6-2,32.8v5.8 c0,2.2,1.6,4.1,3.8,4.4l4.7,0.7c0.4,1.9,1.1,3.8,2,5.5l-2.9,3.8c-1,1.3-0.8,3.2,0.4,4.4l4.4,4.4c1.2,1.2,3.1,1.4,4.4,0.4l3.8-2.9 c1.7,1,3.5,1.7,5.5,2l0.7,4.7c0.3,2.2,2.2,3.8,4.4,3.8h5.8c2.2,0,4.1-1.6,4.4-3.8l0.7-4.7c1.9-0.4,3.8-1.1,5.5-2l3.8,2.9 c1.3,1,3.2,0.8,4.4-0.4l4.4-4.4c1.2-1.2,1.4-3.1,0.4-4.4l-2.9-3.8c1-1.7,1.7-3.5,2-5.5l4.7-0.7c2.2-0.3,3.8-2.2,3.8-4.4v-5.8 C64.1,30.6,62.5,28.6,62.3,28.4z M32,46.5c-8,0-14.5-6.5-14.5-14.5S24,17.5,32,17.5S46.5,24,46.5,32S40,46.5,32,46.5z"/>
                          <path fill="#fff" d="M44.7,19.5c-1.9-1.9-4.8-2.3-7.1-1.1L24.1,31.9c-1.5-0.3-3.2,0.1-4.3,1.3c-1.8,1.8-1.8,4.7,0,6.5c1.8,1.8,4.7,1.8,6.5,0 c1.2-1.2,1.6-2.8,1.3-4.3L41.1,21.9C42.4,24.3,46.6,21.4,44.7,19.5z"/>
                      </svg>
                      <p style={{fontFamily: "'Arial Black', sans-serif", fontSize: '11px', letterSpacing: '1px', color: '#333', marginTop: '5px'}}>MAINTENANCE</p>
                  </div>
                  <div className="header-text" style={{textAlign: 'left'}}>
                      <p style={{direction: 'rtl', fontSize: '13px', marginBottom: '5px'}}>ژمارەی مۆبایل:</p>
                      <p style={{direction: 'ltr', fontSize: '13px'}}>0750 994 9094</p>
                      <p style={{direction: 'ltr', fontSize: '13px'}}>0750 726 6362</p>
                  </div>
              </div>

              <div className="invoice-title-container">
                  <div className="invoice-title">
                    ڕقم 
                    <input type="text" className="inv-input inline" style={{width: '80px', marginRight: '10px'}} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="000" />
                  </div>
                  <div className="no-print" style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    gap: '5px'
                  }}>
                    {debtAmount === 0 ? (
                      <button 
                        onClick={() => {
                          if (window.confirm('دڵنیایت لە وەرنەگرتنی ئەم وەسڵە؟ (قەرزەکە دەگەڕێتەوە)')) {
                            setCashPaid(0);
                          }
                        }}
                        title="گۆڕین بۆ وەرنەگیراو"
                        style={{
                          backgroundColor: '#e8f5e9',
                          color: '#2e7d32',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          border: '1px solid #c8e6c9',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <CheckCircle className="w-4 h-4" /> وەرگیراوە
                      </button>
                    ) : (
                      <button 
                        onClick={() => setCashPaid(totalAfterDiscount)}
                        title="وەک وەرگیراو دیاری بکە"
                        style={{
                          backgroundColor: '#fff3e0',
                          color: '#e65100',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          border: '1px solid #ffe0b2',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <XCircle className="w-4 h-4" /> وەرنەگیراوە
                      </button>
                    )}
                  </div>
                  {/* Static badge for print/image only */}
                  {debtAmount === 0 && (
                    <div className="only-print" style={{
                      position: 'absolute',
                      left: '20px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: '#e8f5e9',
                      color: '#2e7d32',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      border: '1px solid #c8e6c9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <CheckCircle className="w-4 h-4" /> وەرگیراوە
                    </div>
                  )}
              </div>

              <div className="info-container">
                  <div className="info-box">
                      <div><strong>پسوولەی کاری سیانە و پارچە</strong></div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px'}}>
                        ڕێکەوت: 
                        <input type="date" className="inv-input inline transparent" value={date} onChange={e => setDate(e.target.value)} />
                      </div>
                      <div style={{marginTop: '5px'}}>کۆپی: بنەڕەت (ئەسڵی)</div>
                  </div>
                  <div className="info-box" style={{border: 'none', padding: 0}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', paddingBottom: '5px'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '5px', flex: 1}}>
                            ناوی کڕیار: 
                            <input type="text" className="inv-input transparent" style={{fontWeight: 'bold'}} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="ناوی کڕیار..." />
                            <SpeechToTextButton onResult={(text) => setCustomerName(prev => prev ? `${prev} ${text}` : text)} className="p-1" />
                          </div>
                          <div style={{display: 'flex', alignItems: 'center', gap: '5px', width: '120px'}}>
                            مۆبایل: 
                            <input type="text" className="inv-input transparent" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="0750..." />
                          </div>
                      </div>
                      <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: '5px'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '5px', width: '100%'}}>
                            زانیاری ئامێر / کار: 
                            <input type="text" className="inv-input transparent" style={{fontWeight: 'bold'}} value={deviceInfo} onChange={e => setDeviceInfo(e.target.value)} placeholder="جۆری ئامێر یان کێشەکە..." />
                            <SpeechToTextButton onResult={(text) => setDeviceInfo(prev => prev ? `${prev} ${text}` : text)} className="p-1" />
                          </div>
                      </div>
                  </div>
              </div>

              <table>
                  <thead>
                      <tr>
                          <th style={{width: '15%'}}>کۆی گشتی</th>
                          <th style={{width: '15%'}}>نرخی تاک</th>
                          <th style={{width: '10%'}}>بڕ</th>
                          <th style={{width: '10%'}}>یەکە</th>
                          <th className="desc-column" style={{width: '45%'}}>وردەکارییەکان (ناوی پارچە / جۆری کار)</th>
                          <th style={{width: '5%'}}>#</th>
                      </tr>
                  </thead>
                  <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id}>
                            <td>{item.total.toLocaleString()}</td>
                            <td><input type="number" className="inv-input transparent" style={{textAlign: 'center'}} value={item.unitPrice || ''} onChange={e => handleItemChange(item.id, 'unitPrice', Number(e.target.value))} /></td>
                            <td><input type="number" className="inv-input transparent" style={{textAlign: 'center'}} value={item.quantity || ''} onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))} /></td>
                            <td><input type="text" className="inv-input transparent" style={{textAlign: 'center'}} value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} placeholder="دانە" /></td>
                            <td className="desc-column"><input type="text" className="inv-input transparent" style={{textAlign: 'right'}} value={item.name} onChange={e => handleItemChange(item.id, 'name', e.target.value)} placeholder="ناوی پارچە..." /></td>
                            <td>
                              <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700" title="سڕینەوە">
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={6} style={{padding: '0'}}>
                          <button onClick={handleAddItem} className="w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold flex items-center justify-center gap-2 transition-colors">
                            <Plus className="w-4 h-4" /> زیادکردنی ڕیز
                          </button>
                        </td>
                      </tr>
                  </tbody>
              </table>

              <div className="bottom-section">
                  <div className="totals-details">
                      <div><span>کۆی گشتی:</span> <span>{totalAmount.toLocaleString()}</span></div>
                      <div>
                        <span>بڕی داشکاندن:</span> 
                        <input type="number" className="inv-input transparent num" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} placeholder="0" />
                      </div>
                      <div><span>بڕ دوای داشکاندن:</span> <span>{totalAfterDiscount.toLocaleString()}</span></div>
                      <div className="bold-total"><span>کۆی گشتیی پسوولە:</span> <strong>{totalAfterDiscount.toLocaleString()}</strong></div>
                      <div style={{textAlign: 'center', fontSize: '11px', border: 'none', display: 'block', paddingTop: '10px', minHeight: '15px'}}>
                          {/* نووسینی بڕی پارەکە بە پیت */}
                      </div>
                  </div>

                  <div className="payment-details">
                      <div className="payment-title">تفاصيل الدفع (وردەکاری پارەدان)</div>
                      <div>
                        <span>نەقد (کاش):</span> 
                        <div className="gray-bg" style={{padding: '0 5px', display: 'flex', alignItems: 'center'}}>
                          <input type="number" className="inv-input transparent num" style={{fontWeight: 'bold'}} value={cashPaid || ''} onChange={e => setCashPaid(Number(e.target.value))} placeholder="0" />
                        </div>
                      </div>
                      <div style={debtAmount > 0 ? {backgroundColor: '#ffebee', color: '#c62828', fontWeight: 'bold'} : {}}>
                        <span>لەسەر حیساب (قەرز):</span> 
                        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                          {remainingBalance < 0 && (
                            <button 
                              onClick={() => setDebtAmount(Math.max(0, debtAmount + remainingBalance))}
                              title="ڕێکخستنی قەرز"
                              className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-0.5 rounded text-[10px] font-bold transition-colors whitespace-nowrap"
                            >
                              ڕێکخستن
                            </button>
                          )}
                          <input type="number" className="inv-input transparent num" style={debtAmount > 0 ? {color: '#c62828', fontWeight: 'bold'} : {}} value={debtAmount || ''} onChange={e => setDebtAmount(Number(e.target.value))} placeholder="0" />
                        </div>
                      </div>
                      <div>
                        <span>باڵانسی ماوە:</span> 
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span style={remainingBalance < 0 ? {color: '#c62828', fontWeight: 'bold'} : {}}>{remainingBalance.toLocaleString()}</span>
                          {remainingBalance > 0 && (
                            <button 
                              onClick={() => setDebtAmount((debtAmount || 0) + remainingBalance)}
                              title="خستنە سەر قەرز"
                              className="bg-red-100 text-red-700 hover:bg-red-200 px-2 py-0.5 rounded text-xs font-bold transition-colors"
                            >
                              + قەرز
                            </button>
                          )}
                          {remainingBalance < 0 && (
                            <button 
                              onClick={() => setDebtAmount(Math.max(0, debtAmount + remainingBalance))}
                              title="ڕێکخستنی قەرز"
                              className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-0.5 rounded text-xs font-bold transition-colors"
                            >
                              ڕێکخستن
                            </button>
                          )}
                        </div>
                      </div>
                  </div>
              </div>

              <div className="footer-notes">
                  <p style={{float: 'right', width: '50%'}}>
                      <strong style={{display: 'inline-block', width: '120px'}}>ناوی تەکنیکار:</strong> 
                      <input type="text" className="inv-input transparent inline" style={{width: 'calc(100% - 130px)'}} value={technicianName} onChange={e => setTechnicianName(e.target.value)} placeholder="ناو..." /><br/>
                      <strong style={{display: 'inline-block', width: '120px', marginTop: '5px'}}>گەرەنتی (ضمان):</strong> 
                      <input type="text" className="inv-input transparent inline" style={{width: 'calc(100% - 130px)', marginTop: '5px'}} value={warranty} onChange={e => setWarranty(e.target.value)} placeholder="ماوەی زەمان..." />
                  </p>
                  
                  <div className="notes-box">
                      <div className="notes-title">ملاحظات (تێبینی)</div>
                      <div className="notes-content" style={{display: 'flex', alignItems: 'flex-start', gap: '5px'}}>
                          <textarea className="inv-input transparent" style={{minHeight: '50px', resize: 'none'}} value={notes} onChange={e => setNotes(e.target.value)} placeholder="تێبینییەکان..."></textarea>
                          <SpeechToTextButton onResult={(text) => setNotes(prev => prev ? `${prev}\n${text}` : text)} className="p-1" />
                      </div>
                  </div>
              </div>

              <div className="signatures">
                  <p><strong>واژووی کڕیار (المستلم):</strong> .....................................</p>
                  <p><strong>واژووی سەرپەرشتیار:</strong> .....................................</p>
              </div>
          </div>

          {/* Factory Calculations - Outside the paper */}
          <div className="w-full max-w-[148mm] bg-white rounded-2xl p-6 shadow-lg mt-6" style={{direction: 'rtl'}}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">حیساباتی کارگە (تایبەت بە خۆت)</h3>
            <p className="text-sm text-gray-500 mb-4">ئەم بەشە لە وەسڵەکە دەرناکەوێت، تەنها بۆ ئەوەیە بزانیت چەند پارەی خۆتت سەرف کردووە یان چەندت لە کارگە وەرگرتووە.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">بڕی وەرگیراو لە کارگە بۆ ئەم کارە</label>
                <input type="number" value={receivedFromFactory || ''} onChange={e => setReceivedFromFactory(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900" placeholder="0" />
              </div>
              <div className="flex flex-col justify-center space-y-2">
                {factoryOwesMe > 0 && (
                  <div className="text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                    کارگە قەرزاری منە: {factoryOwesMe.toLocaleString()}
                  </div>
                )}
                {iOweFactory > 0 && (
                  <div className="text-green-600 font-bold bg-green-50 p-3 rounded-xl border border-green-100">
                    من قەرزاری کارگەم: {iOweFactory.toLocaleString()}
                  </div>
                )}
                {factoryOwesMe === 0 && iOweFactory === 0 && (
                  <div className="text-blue-600 font-bold bg-blue-50 p-3 rounded-xl border border-blue-100">
                    حیسابات سافە
                  </div>
                )}
              </div>
            </div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-bold mb-1">کۆی گشتی سەرفکراو</p>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300">
            {invoices.reduce((sum, inv) => sum + (inv.totalAfterDiscount || 0), 0).toLocaleString()} د.ع
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-800/30">
          <p className="text-sm text-red-600 dark:text-red-400 font-bold mb-1">کارگە قەرزدارە</p>
          <p className="text-2xl font-black text-red-700 dark:text-red-300">
            {invoices.reduce((sum, inv) => sum + (inv.factoryOwesMe || 0), 0).toLocaleString()} د.ع
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800/30">
          <p className="text-sm text-green-600 dark:text-green-400 font-bold mb-1">پارەی کارگە لای من ماوە</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-300">
            {invoices.reduce((sum, inv) => sum + (inv.iOweFactory || 0), 0).toLocaleString()} د.ع
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {invoices.map(invoice => (
          <motion.div 
            key={invoice.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-3xl p-6 shadow-sm border space-y-4",
              invoice.debtAmount > 0 
                ? "bg-red-50 dark:bg-red-900/10 border-red-500" 
                : "bg-[var(--bg-card)] border-[var(--border-color)]"
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg text-[var(--text-main)]">{invoice.customerName || 'بێ ناو'}</h3>
                  {invoice.title && invoice.title !== 'خەرجی کارگە' && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
                      {invoice.title}
                    </span>
                  )}
                  {invoice.debtAmount === 0 && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> وەرگیراوە
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)]">{invoice.date} - ڕقم: {invoice.invoiceNumber}</p>
              </div>
              <div className="text-left">
                <p className="font-bold text-blue-600 dark:text-blue-400">{invoice.totalAfterDiscount.toLocaleString()} د.ع</p>
              </div>
            </div>
            
            <div className="text-sm text-[var(--text-muted)] flex flex-col gap-1">
              <div className="line-clamp-1"><strong>ئامێر:</strong> {invoice.deviceInfo}</div>
              {invoice.technicianName && (
                <div className="text-xs bg-[var(--bg-main)] px-2 py-1 rounded border border-[var(--border-color)] inline-block w-fit">
                  <strong>تەکنیکار:</strong> {invoice.technicianName}
                </div>
              )}
            </div>

            {invoice.debtAmount > 0 && (
              <div className="text-sm font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded-lg inline-block">
                قەرز: {invoice.debtAmount.toLocaleString()} د.ع
              </div>
            )}

            {(invoice.factoryOwesMe > 0 || invoice.iOweFactory > 0) && (
              <div className="text-xs font-bold p-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
                {invoice.factoryOwesMe > 0 ? (
                  <span className="text-red-500">کارگە قەرزاری منە: {invoice.factoryOwesMe.toLocaleString()}</span>
                ) : (
                  <span className="text-green-500">من قەرزاری کارگەم: {invoice.iOweFactory.toLocaleString()}</span>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-[var(--border-color)] flex-wrap">
              <Button variant="secondary" size="sm" onClick={() => handleEdit(invoice)} className="flex-1 flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" /> بینین
              </Button>
              <Button variant="primary" size="sm" onClick={() => handlePrint(invoice)} className="flex-1 flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> پرینت
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleDownloadImage(invoice)} className="flex-1 flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> وێنە
              </Button>
              {invoice.debtAmount > 0 ? (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => handleMarkAsPaid(invoice)} 
                  className="flex-1 flex items-center justify-center gap-2 bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                >
                  <CheckCircle className="w-4 h-4" /> وەرگیرا
                </Button>
              ) : (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => handleMarkAsUnpaid(invoice)} 
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200"
                >
                  <XCircle className="w-4 h-4" /> وەرنەگیرا
                </Button>
              )}
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
