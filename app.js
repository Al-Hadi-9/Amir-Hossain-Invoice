document.addEventListener('DOMContentLoaded', function() {
  const items = [];
  const vatRate = 0.15;
  const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const dom = {
    invoiceNo: document.getElementById('invoiceNo'),
    invoiceDate: document.getElementById('invoiceDate'),
    companyName: document.getElementById('companyName'),
    customerVat: document.getElementById('customerVat'),
    productName: document.getElementById('productName'),
    quantity: document.getElementById('quantity'),
    price: document.getElementById('price'),
    addItemBtn: document.getElementById('addItemBtn'),
    clearBtn: document.getElementById('clearBtn'),
    savePdfBtn: document.getElementById('savePdfBtn'),
    printBtn: document.getElementById('printBtn'),
    itemsBody: document.getElementById('itemsBody'),
    subtotalValue: document.getElementById('subtotalValue'),
    vatValue: document.getElementById('vatValue'),
    totalValue: document.getElementById('totalValue'),
    previewSubtotal: document.getElementById('previewSubtotal'),
    previewVat: document.getElementById('previewVat'),
    previewTotal: document.getElementById('previewTotal'),
    previewCompany: document.getElementById('previewCompany'),
    previewCustomer: document.getElementById('previewCustomer'),
    previewInvoiceNo: document.getElementById('previewInvoiceNo'),
    previewDate: document.getElementById('previewDate'),
    previewCustomerVat: document.getElementById('previewCustomerVat'),
    invoicePreview: document.getElementById('invoicePreview'),
    companyNameDisplay: document.getElementById('companyNameDisplay'),
    companyLabel: document.getElementById('companyLabel'),
    qrCodeImage: document.getElementById('qrCodeImage'),
    customerInfoContainer: document.getElementById('customerInfoContainer'),
    customerVatDisplay: document.getElementById('customerVatDisplay'),
  };

  const invoiceCounterKey = 'invoice-counter';
  const invoicePrefix = 'INV-2026-';
  const SELLER_NAME = "Shurooq Miser Al-Otaibi Est.";
  const SELLER_VAT = "310418356300003";

  // Store QR code data URL for PDF export
  let qrDataURL = null;

  function formatMoney(amount) {
    return `S.R ${currency.format(amount || 0)}`;
  }

  function getCurrentDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
    const time = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    return `${date} ${time}`;
  }

  function getCurrentDateTimeISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function getNextInvoiceNumber() {
    const savedValue = Number(window.localStorage.getItem(invoiceCounterKey));
    const nextValue = Number.isFinite(savedValue) && savedValue > 0 ? savedValue : 1;
    return `${invoicePrefix}${String(nextValue).padStart(2, '0')}`;
  }

  function advanceInvoiceNumber() {
    const savedValue = Number(window.localStorage.getItem(invoiceCounterKey));
    const nextValue = Number.isFinite(savedValue) && savedValue > 0 ? savedValue + 1 : 2;
    window.localStorage.setItem(invoiceCounterKey, String(nextValue));
    dom.invoiceNo.value = `${invoicePrefix}${String(nextValue).padStart(2, '0')}`;
  }

  function createPdfExportNode() {
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-export-root';

    const previewClone = dom.invoicePreview.cloneNode(true);
    previewClone.classList.add('pdf-export-preview');
    wrapper.appendChild(previewClone);
    document.body.appendChild(wrapper);

    return { wrapper, previewClone };
  }

  function safeText(value, fallback) {
    const text = String(value || '').trim();
    return text.length ? text : fallback;
  }

  // ============= ZATCA QR CODE GENERATION =============
  function stringToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    return bytes;
  }

  function tlvEncode(tag, value) {
    const valueStr = String(value);
    const valueBytes = stringToBytes(valueStr);
    const length = valueBytes.length;
    
    const result = [tag, length, ...valueBytes];
    return result;
  }

  function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function generateZATCAQR(totalData) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const zatcaDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

      const sellerName = "Shurooq Miser Al-Otaibi Est.";
      const sellerVat = "310418356300003";
      const invoiceTotal = totalData.total.toFixed(2);
      const vatTotal = totalData.vat.toFixed(2);
      const invoiceNo = totalData.invoiceNo || 'INV-2026-01';
      const customerName = totalData.company || '';
      const customerVat = totalData.customerVat || '';
      const subtotal = totalData.subtotal.toFixed(2);

      const tlvData = [
        ...tlvEncode(1, sellerName),
        ...tlvEncode(2, sellerVat),
        ...tlvEncode(3, zatcaDate),
        ...tlvEncode(4, invoiceTotal),
        ...tlvEncode(5, vatTotal),
        ...tlvEncode(6, invoiceNo)
      ];

      if (customerName && customerName.trim() !== '') {
        tlvData.push(...tlvEncode(7, customerName));
      }
      if (customerVat && customerVat.trim() !== '' && customerVat.trim() !== '--') {
        tlvData.push(...tlvEncode(8, customerVat));
      }
      if (subtotal && parseFloat(subtotal) > 0) {
        tlvData.push(...tlvEncode(9, subtotal));
      }

      const base64 = bytesToBase64(tlvData);
      
      console.log('✅ ZATCA QR Data generated successfully');
      return base64;
    } catch (error) {
      console.error('ZATCA QR generation error:', error);
      return null;
    }
  }

  // Generate QR code as canvas and store data URL
  function generateQRAsImage(qrData) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof QRCode === 'undefined') {
          reject(new Error('QRCode library not loaded'));
          return;
        }

        // Create a temporary container
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        document.body.appendChild(tempDiv);

        // Generate QR code
        new QRCode(tempDiv, {
          text: qrData,
          width: 200, // Higher resolution for PDF
          height: 200,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });

        // Wait for QR code to render
        setTimeout(() => {
          const canvas = tempDiv.querySelector('canvas');
          if (canvas) {
            const dataURL = canvas.toDataURL('image/png');
            document.body.removeChild(tempDiv);
            resolve(dataURL);
          } else {
            document.body.removeChild(tempDiv);
            reject(new Error('Canvas not found'));
          }
        }, 100);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Main QR Code update function
  function updateQRCode(totalData) {
    try {
      if (!dom.qrCodeImage) {
        console.error('QR Code container not found');
        return;
      }

      if (typeof QRCode === 'undefined') {
        console.error('QRCode library not loaded');
        dom.qrCodeImage.innerHTML = `
          <div style="width:100px;height:100px;border:2px solid #ccc;
                      display:flex;align-items:center;justify-content:center;
                      background:#f9f9f9;border-radius:4px;font-size:10px;
                      color:#666;text-align:center;padding:5px;">
            QR Library Missing
          </div>
        `;
        return;
      }

      const qrData = generateZATCAQR(totalData);
      
      if (!qrData) {
        throw new Error('Failed to generate QR data');
      }

      // Clear container
      dom.qrCodeImage.innerHTML = '';

      // Generate QR Code for display
      new QRCode(dom.qrCodeImage, {
        text: qrData,
        width: 100,
        height: 100,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });

      // Generate high-res QR for PDF and store it
      generateQRAsImage(qrData)
        .then(dataURL => {
          qrDataURL = dataURL;
          console.log('✅ QR Code image generated for PDF');
        })
        .catch(error => {
          console.error('Failed to generate QR image for PDF:', error);
          // Fallback: try to get from DOM
          setTimeout(() => {
            const canvas = dom.qrCodeImage.querySelector('canvas');
            if (canvas) {
              qrDataURL = canvas.toDataURL('image/png');
              console.log('✅ QR Code image captured from DOM for PDF');
            }
          }, 200);
        });

      console.log('✅ QR Code generated successfully');

    } catch (error) {
      console.error('QR Code update error:', error);
      dom.qrCodeImage.innerHTML = `
        <div style="width:100px;height:100px;border:2px solid #ff6b6b;
                    display:flex;align-items:center;justify-content:center;
                    background:#fff5f5;border-radius:4px;font-size:10px;
                    color:#c92a2a;text-align:center;padding:5px;">
          QR Error
        </div>
      `;
    }
  }

  // ============= END QR CODE GENERATION =============

  function calculateTotals() {
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const vat = subtotal * vatRate;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  }

  function render() {
    const invoiceNo = safeText(dom.invoiceNo.value, 'INV-2026-01');
    const companyName = safeText(dom.companyName.value, '');
    const customerVat = safeText(dom.customerVat.value, '--');
    
    const dateTimeLabel = getCurrentDateTime();

    dom.companyLabel.style.display = 'inline';
    dom.companyNameDisplay.style.display = 'inline';
    dom.companyNameDisplay.textContent = companyName || '--';
    dom.previewCustomerVat.textContent = customerVat;
    dom.previewInvoiceNo.textContent = invoiceNo;
    dom.previewDate.textContent = dateTimeLabel;

    if (!items.length) {
      dom.itemsBody.innerHTML = '<tr class="empty-row"><td colspan="5" style="padding: 20px 10px; font-size: .9rem;">No products added yet.</td></tr>';
    } else {
      dom.itemsBody.innerHTML = items
        .map((item, index) => {
          const lineTotal = item.qty * item.price;
          const vat = lineTotal * vatRate;
          return `
            <tr>
              <td>
                <span class="item-name">${item.name}</span>
              </td>
              <td>${item.qty}</td>
              <td>${formatMoney(item.price)}</td>
              <td>${formatMoney(vat)}</td>
              <td>
                ${formatMoney(lineTotal + vat)}
                <div class="item-actions">
                  <button class="remove-btn" type="button" data-remove-index="${index}">Remove</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    }

    const { subtotal, vat, total } = calculateTotals();

    dom.subtotalValue.textContent = formatMoney(subtotal);
    dom.vatValue.textContent = formatMoney(vat);
    dom.totalValue.textContent = formatMoney(total);
    dom.previewSubtotal.textContent = formatMoney(subtotal);
    dom.previewVat.textContent = formatMoney(vat);
    dom.previewTotal.textContent = formatMoney(total);

    const qrData = {
      invoiceNo,
      company: companyName,
      customerVat,
      date: dateTimeLabel,
      subtotal,
      vat,
      total
    };

    setTimeout(() => {
      updateQRCode(qrData);
    }, 100);
  }

  function addItem() {
    const name = dom.productName.value.trim();
    const qty = Number(dom.quantity.value);
    const price = Number(dom.price.value);

    if (!name) {
      dom.productName.focus();
      return;
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      dom.quantity.focus();
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      dom.price.focus();
      return;
    }

    items.push({ name, qty, price });
    dom.productName.value = '';
    dom.quantity.value = '1';
    dom.price.value = '';
    dom.productName.focus();
    render();
  }

  function clearAll() {
    items.length = 0;
    dom.productName.value = '';
    dom.quantity.value = '1';
    dom.price.value = '';
    render();
  }

  function printInvoice() {
    window.print();
  }

  async function savePdf() {
    const html2canvasLib = window.html2canvas;
    const jsPDFLib = window.jspdf && window.jspdf.jsPDF;
    const originalLabel = dom.savePdfBtn.textContent;
    let pdfExportNode = null;

    if (!html2canvasLib || !jsPDFLib) {
      alert('PDF library is still loading. Please try again in a moment.');
      return;
    }

    dom.savePdfBtn.textContent = 'Preparing PDF...';

    try {
      // Wait for QR code to be ready
      if (!qrDataURL) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      pdfExportNode = createPdfExportNode();

      // If we have a stored QR data URL, replace the QR code in the preview with an img element
      if (qrDataURL) {
        const qrContainer = pdfExportNode.previewClone.querySelector('#qrCodeImage');
        if (qrContainer) {
          qrContainer.innerHTML = `<img src="${qrDataURL}" style="width:100px;height:100px;display:block;" />`;
        }
      }

      const canvas = await html2canvasLib(pdfExportNode.previewClone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        onclone: function(clonedDoc) {
          // Ensure QR code is visible in cloned document
          const qrImg = clonedDoc.querySelector('#qrCodeImage img');
          if (qrImg) {
            qrImg.style.display = 'block';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDFLib({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;
      const imgWidth = availableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= availableHeight) {
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      } else {
        const fitRatio = availableHeight / imgHeight;
        const fitWidth = imgWidth * fitRatio;
        const fitHeight = imgHeight * fitRatio;
        const fitX = (pageWidth - fitWidth) / 2;
        pdf.addImage(imgData, 'PNG', fitX, margin, fitWidth, fitHeight);
      }

      pdf.save(`${safeText(dom.invoiceNo.value, 'invoice')}.pdf`);

      advanceInvoiceNumber();
      clearAll();
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Please try again.');
    } finally {
      if (pdfExportNode) {
        pdfExportNode.wrapper.remove();
      }
      dom.savePdfBtn.textContent = originalLabel;
    }
  }

  // Event Listeners
  document.addEventListener('click', function(event) {
    const button = event.target.closest('[data-remove-index]');
    if (!button) {
      return;
    }

    const index = Number(button.dataset.removeIndex);
    if (Number.isInteger(index)) {
      items.splice(index, 1);
      render();
    }
  });

  dom.addItemBtn.addEventListener('click', addItem);
  dom.clearBtn.addEventListener('click', clearAll);
  dom.savePdfBtn.addEventListener('click', savePdf);
  dom.printBtn.addEventListener('click', printInvoice);

  dom.productName.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') addItem();
  });
  dom.price.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') addItem();
  });
  dom.quantity.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') addItem();
  });

  dom.companyName.addEventListener('input', render);
  dom.companyName.addEventListener('change', render);
  dom.customerVat.addEventListener('input', render);
  dom.customerVat.addEventListener('change', render);

  // Initialize
  dom.invoiceDate.value = getCurrentDateTimeISO();
  dom.invoiceNo.value = getNextInvoiceNumber();
  
  console.log('🚀 App initialized');
  console.log('QRCode library:', typeof QRCode !== 'undefined' ? '✅ Loaded' : '❌ Not loaded');
  
  render();
});