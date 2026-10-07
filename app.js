document.addEventListener('DOMContentLoaded', function () {

  const authSessionKey = 'invoice-authenticated';
  const loginCredentials = { username: '0501967413', password: 'Aa@123456' };

  const authScreen    = document.getElementById('authScreen');
  const loginForm     = document.getElementById('loginForm');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const authError     = document.getElementById('authError');
  const logoutBtn     = document.getElementById('logoutBtn');

  console.log('🔐 Auth:', {
    authScreen: !!authScreen, loginForm: !!loginForm,
    loginUsername: !!loginUsername, loginPassword: !!loginPassword,
  });

  function setAuthenticated(isAuthenticated) {
    document.body.classList.toggle('is-authenticated', isAuthenticated);
    if (authScreen) authScreen.hidden = isAuthenticated;
    if (!isAuthenticated && loginForm) {
      loginForm.reset();
      authError.textContent = '';
      loginUsername.focus();
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const isValid =
        loginUsername.value.trim() === loginCredentials.username &&
        loginPassword.value === loginCredentials.password;

      console.log('🔑 Login:', {
        user: loginUsername.value.trim(),
        valid: isValid,
      });

      if (!isValid) {
        authError.textContent = 'Incorrect username or password.';
        loginPassword.select();
        return;
      }
      window.localStorage.setItem(authSessionKey, 'true');
      authError.textContent = '';
      setAuthenticated(true);
      console.log('✅ Login successful');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      window.localStorage.removeItem(authSessionKey);
      setAuthenticated(false);
    });
  }

  setAuthenticated(window.localStorage.getItem(authSessionKey) === 'true');

    //  2. STATE
     
  const items   = [];
  const vatRate = 0.15;
  const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

  const dom = {
    invoiceNo          : document.getElementById('invoiceNo'),
    invoiceDate        : document.getElementById('invoiceDate'),
    invoiceTime        : document.getElementById('invoiceTime'),
    companyName        : document.getElementById('companyName'),
    customerVat        : document.getElementById('customerVat'),
    productName        : document.getElementById('productName'),
    quantity           : document.getElementById('quantity'),
    price              : document.getElementById('price'),
    addItemBtn         : document.getElementById('addItemBtn'),
    clearBtn           : document.getElementById('clearBtn'),
    savePdfBtn         : document.getElementById('savePdfBtn'),
    printBtn           : document.getElementById('printBtn'),
    itemsBody          : document.getElementById('itemsBody'),
    subtotalValue      : document.getElementById('subtotalValue'),
    vatValue           : document.getElementById('vatValue'),
    totalValue         : document.getElementById('totalValue'),
    previewSubtotal    : document.getElementById('previewSubtotal'),
    previewVat         : document.getElementById('previewVat'),
    previewTotal       : document.getElementById('previewTotal'),
    previewInvoiceNo   : document.getElementById('previewInvoiceNo'),
    previewDate        : document.getElementById('previewDate'),
    previewCustomerVat : document.getElementById('previewCustomerVat'),
    invoicePreview     : document.getElementById('invoicePreview'),
    companyNameDisplay : document.getElementById('companyNameDisplay'),
    companyLabel       : document.getElementById('companyLabel'),
    qrCodeImage        : document.getElementById('qrCodeImage'),
    invoiceType        : document.getElementById('invoiceType'),
    previewInvoiceType : document.getElementById('previewInvoiceType'),
    vatNumberBox       : document.getElementById('vatNumberBox'),
    qrSection          : document.getElementById('qrSection'),
    locationQrImage    : document.getElementById('locationQrImage'),
  };

  const invoiceCounterKey = 'invoice-counter';
  const invoicePrefix     = 'INV-2026-';

  let qrDataURL         = null;
  let locationQrDataURL = null;

  const LOCATION_MAPS_URL = 'https://maps.app.goo.gl/odBX7DuUPAerT4Uy5?g_st=aw';

  
    //  3. HELPERS
  
  function formatMoney(amount) {
    return `S.R ${currency.format(amount || 0)}`;
  }
  function getCurrentDateTime() {
    const now  = new Date();
    const date = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return `${date} ${time}`;
  }
  function getCurrentDateTimeISO() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
  function safeText(value, fallback) {
    const t = String(value || '').trim();
    return t.length ? t : fallback;
  }
  function getNextInvoiceNumber() {
    const saved = Number(window.localStorage.getItem(invoiceCounterKey));
    const next  = Number.isFinite(saved) && saved > 0 ? saved : 1;
    return `${invoicePrefix}${String(next).padStart(2, '0')}`;
  }
  function advanceInvoiceNumber() {
    const saved = Number(window.localStorage.getItem(invoiceCounterKey));
    const next  = Number.isFinite(saved) && saved > 0 ? saved + 1 : 2;
    window.localStorage.setItem(invoiceCounterKey, String(next));
    dom.invoiceNo.value = `${invoicePrefix}${String(next).padStart(2, '0')}`;
  }
  function isFinalInvoice() {
    return dom.invoiceType && dom.invoiceType.value === 'final';
  }
  function calculateTotals() {
    const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
    const vat      = subtotal * vatRate;
    return { subtotal, vat, total: subtotal + vat };
  }

    //  4. QR CODE

  function stringToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
    return bytes;
  }
  function tlvEncode(tag, value) {
    const vb = stringToBytes(String(value));
    return [tag, vb.length, ...vb];
  }
  function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  function generateZATCAQR(totalData) {
    try {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const zatcaDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const sellerName = "Shurooq Miser Al-Otaibi Est.";
      const sellerVat  = "310418356300003";
      const invoiceTotal = totalData.total.toFixed(2);
      const vatTotal     = totalData.vat.toFixed(2);
      const invoiceNo    = totalData.invoiceNo || 'INV-2026-01';
      const customerName = totalData.company || '';
      const customerVat  = totalData.customerVat || '';
      const subtotal     = totalData.subtotal.toFixed(2);

      const tlvData = [
        ...tlvEncode(1, sellerName),
        ...tlvEncode(2, sellerVat),
        ...tlvEncode(3, zatcaDate),
        ...tlvEncode(4, invoiceTotal),
        ...tlvEncode(5, vatTotal),
        ...tlvEncode(6, invoiceNo),
      ];
      if (customerName && customerName.trim()) tlvData.push(...tlvEncode(7, customerName));
      if (customerVat && customerVat.trim() && customerVat.trim() !== '--') tlvData.push(...tlvEncode(8, customerVat));
      if (subtotal && parseFloat(subtotal) > 0) tlvData.push(...tlvEncode(9, subtotal));

      return bytesToBase64(tlvData);
    } catch (error) {
      console.error('ZATCA QR error:', error);
      return null;
    }
  }

  function generateQRAsImage(qrData) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof QRCode === 'undefined') {
          reject(new Error('QRCode library not loaded'));
          return;
        }
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
        document.body.appendChild(tempDiv);

        new QRCode(tempDiv, {
          text: qrData, width: 200, height: 200,
          colorDark: "#000000", colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H,
        });

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
      } catch (err) { reject(err); }
    });
  }

  function updateInvoiceDetailsQR(totalData) {
    try {
      if (!dom.qrCodeImage) return;
      if (typeof QRCode === 'undefined') {
        dom.qrCodeImage.innerHTML = `<div style="width:100px;height:100px;border:2px solid #ccc;display:flex;align-items:center;justify-content:center;background:#f9f9f9;border-radius:4px;font-size:10px;color:#666;text-align:center;padding:5px;">QR Library Missing</div>`;
        return;
      }
      const qrData = generateZATCAQR(totalData);
      if (!qrData) throw new Error('ZATCA QR data failed');

      dom.qrCodeImage.innerHTML = '';
      new QRCode(dom.qrCodeImage, {
        text: qrData, width: 100, height: 100,
        colorDark: "#000000", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });

      generateQRAsImage(qrData)
        .then(url => { qrDataURL = url; })
        .catch(() => {
          setTimeout(() => {
            const c = dom.qrCodeImage.querySelector('canvas');
            if (c) qrDataURL = c.toDataURL('image/png');
          }, 200);
        });
    } catch (error) {
      console.error('Invoice Details QR error:', error);
      dom.qrCodeImage.innerHTML = `<div style="width:100px;height:100px;border:2px solid #ff6b6b;display:flex;align-items:center;justify-content:center;background:#fff5f5;border-radius:4px;font-size:10px;color:#c92a2a;text-align:center;padding:5px;">QR Error</div>`;
    }
  }

  function updateLocationQR() {
    try {
      if (!dom.locationQrImage) return;
      if (typeof QRCode === 'undefined') {
        dom.locationQrImage.innerHTML = `<div style="width:60px;height:60px;border:2px solid #ccc;display:flex;align-items:center;justify-content:center;background:#f9f9f9;border-radius:4px;font-size:9px;color:#666;text-align:center;padding:4px;">QR Missing</div>`;
        return;
      }
      dom.locationQrImage.innerHTML = '';
      new QRCode(dom.locationQrImage, {
        text: LOCATION_MAPS_URL, width: 60, height: 60,
        colorDark: "#000000", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });

      generateQRAsImage(LOCATION_MAPS_URL)
        .then(url => { locationQrDataURL = url; })
        .catch(() => {
          setTimeout(() => {
            const c = dom.locationQrImage.querySelector('canvas');
            if (c) locationQrDataURL = c.toDataURL('image/png');
          }, 200);
        });
    } catch (error) {
      console.error('Location QR error:', error);
      dom.locationQrImage.innerHTML = `<div style="width:60px;height:60px;border:2px solid #ff6b6b;display:flex;align-items:center;justify-content:center;background:#fff5f5;border-radius:4px;font-size:9px;color:#c92a2a;text-align:center;padding:4px;">QR Error</div>`;
    }
  }


  //  5. RENDER
   
  function render() {
    const invoiceNo   = safeText(dom.invoiceNo.value, 'INV-2026-01');
    const companyName = safeText(dom.companyName.value, '');
    const customerVat = safeText(dom.customerVat.value, '--');
    const dateTimeLabel = getCurrentDateTime();

    dom.companyLabel.style.display = 'inline';
    dom.companyNameDisplay.style.display = 'inline';
    dom.companyNameDisplay.textContent = companyName || '--';

    dom.previewCustomerVat.textContent = customerVat;
    dom.previewInvoiceNo.textContent   = invoiceNo;
    dom.previewDate.textContent        = dateTimeLabel;

    const isFinal = isFinalInvoice();
    if (dom.previewInvoiceType) {
      dom.previewInvoiceType.textContent = isFinal ? 'FINAL' : 'QUOTATION';
      dom.previewInvoiceType.classList.toggle('is-quotation', !isFinal);
      dom.previewInvoiceType.classList.toggle('is-final', isFinal);
    }
    if (dom.vatNumberBox) dom.vatNumberBox.style.display = '';
    if (dom.qrSection) dom.qrSection.style.display = '';

    if (!items.length) {
      dom.itemsBody.innerHTML = '<tr class="empty-row"><td colspan="5" style="padding:20px 10px;font-size:.9rem;">No products added yet.</td></tr>';
    } else {
      dom.itemsBody.innerHTML = items.map((item, index) => {
        const lineTotal = item.qty * item.price;
        const vat       = lineTotal * vatRate;
        return `
          <tr>
            <td><span class="item-name">${item.name}</span></td>
            <td>${item.qty}</td>
            <td>${formatMoney(item.price)}</td>
            <td>${formatMoney(vat)}</td>
            <td>
              ${formatMoney(lineTotal + vat)}
              <div class="item-actions">
                <button class="remove-btn" type="button" data-remove-index="${index}">Remove</button>
              </div>
            </td>
          </tr>`;
      }).join('');
    }

    const { subtotal, vat, total } = calculateTotals();
    dom.subtotalValue.textContent   = formatMoney(subtotal);
    dom.vatValue.textContent        = formatMoney(vat);
    dom.totalValue.textContent      = formatMoney(total);
    dom.previewSubtotal.textContent = formatMoney(subtotal);
    dom.previewVat.textContent      = formatMoney(vat);
    dom.previewTotal.textContent    = formatMoney(total);

    setTimeout(() => {
      updateLocationQR();
      updateInvoiceDetailsQR({
        invoiceNo, company: companyName, customerVat,
        date: dateTimeLabel, subtotal, vat, total,
      });
    }, 100);
  }

 
    //  6. ITEMS
     
  function addItem() {
    const name  = dom.productName.value.trim();
    const qty   = Number(dom.quantity.value);
    const price = Number(dom.price.value);
    if (!name) { dom.productName.focus(); return; }
    if (!Number.isFinite(qty) || qty <= 0) { dom.quantity.focus(); return; }
    if (!Number.isFinite(price) || price < 0) { dom.price.focus(); return; }

    items.push({ name, qty, price });
    dom.productName.value = '';
    dom.quantity.value = '1';
    dom.price.value = '';
    dom.productName.focus();
    render();
  }
  function clearAll() {
    items.length = 0;
    dom.companyName.value = '';
    dom.customerVat.value = '';
    dom.productName.value = '';
    dom.quantity.value = '1';
    dom.price.value = '';
    render();
  }


  async function generatePDFBlob() {
    // 1. Clone
    const clone = dom.invoicePreview.cloneNode(true);
    clone.querySelectorAll('.remove-btn, .item-actions, .button-row').forEach(el => el.remove());

    // 2. QR canvases → base64 images
    if (qrDataURL) {
      const qrBox = clone.querySelector('#qrCodeImage');
      if (qrBox) qrBox.innerHTML = `<img src="${qrDataURL}" style="width:100px;height:100px;display:block;" alt="QR">`;
    }
    if (locationQrDataURL) {
      const locBox = clone.querySelector('#locationQrImage');
      if (locBox) locBox.innerHTML = `<img src="${locationQrDataURL}" style="width:60px;height:60px;display:block;" alt="QR">`;
    }

    // 3. Keep the export inside A4 portrait's printable width.
    const pdfWidth = 760;

    console.log('📏 PDF width:', pdfWidth, 'px');

    // 4. Offscreen wrapper — exact natural width
    const wrap = document.createElement('div');
    wrap.style.cssText = `
        position: fixed !important;
        left: -99999px !important;
        top: 0 !important;
        width: ${pdfWidth}px !important;
        min-width: ${pdfWidth}px !important;
        max-width: ${pdfWidth}px !important;
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: -1 !important;
        box-sizing: border-box !important;
        overflow: visible !important;
    `;

    // 5. Clone — fills wrapper width exactly, no crop
    clone.style.cssText = `
        width: ${pdfWidth - 4}px !important;
        min-width: ${pdfWidth - 4}px !important;
        max-width: ${pdfWidth - 4}px !important;
        box-sizing: border-box !important;
        margin: 0 2px !important;
        padding: 28px 28px 36px !important;
        border-radius: 0 !important;
        border: 2px solid transparent !important;
        box-shadow: inset 0 0 0 2px #0f8f84 !important;
        overflow: visible !important;
        position: relative !important;
        display: block !important;
        transform: none !important;
        background:
            linear-gradient(155deg,
                rgba(20, 126, 124, 0.92) 0%,
                rgba(138, 234, 219, 0.94) 34%,
                rgba(255, 255, 255, 0.96) 34.1%,
                rgba(255, 255, 255, 0.98) 100%) !important;
    `;

    // 6. Force inner layouts
    const header = clone.querySelector('.preview-header');
    if (header) header.style.cssText = `
        display: flex !important;
        flex-direction: row !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
        gap: 18px !important;
        margin-bottom: 22px !important;
        width: 100% !important;
        box-sizing: border-box !important;
    `;

    clone.querySelectorAll('.header-copy, .header-arabic').forEach(el => {
      el.style.flex = '1 1 0';
      el.style.minWidth = '0';
      el.style.boxSizing = 'border-box';
      el.style.overflow = 'visible';
    });

    const metaRow = clone.querySelector('.invoice-meta-full-width');
    if (metaRow) metaRow.style.cssText = `
        display: flex !important;
        flex-wrap: nowrap !important;
        gap: 8px !important;
        margin: 15px 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
    `;

    clone.querySelectorAll('.meta-box').forEach(el => {
      el.style.flex = '1 1 0';
      el.style.minWidth = '0';
      el.style.boxSizing = 'border-box';
    });

    const custRow = clone.querySelector('.customer-info-row');
    if (custRow) custRow.style.cssText = `
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 12px !important;
        width: 100% !important;
        margin: 14px 0 !important;
        box-sizing: border-box !important;
    `;

    const tableWrap = clone.querySelector('.table-wrap');
    if (tableWrap) tableWrap.style.cssText = `
        overflow: visible !important;
        width: 100% !important;
        display: block !important;
        box-sizing: border-box !important;
    `;

    const table = clone.querySelector('table');
    if (table) table.style.cssText = `
        width: 100% !important;
        min-width: 0 !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
        display: table !important;
        box-sizing: border-box !important;
    `;

    const footer = clone.querySelector('.invoice-footer');
    if (footer) footer.style.cssText = `
      display: grid !important;
      grid-template-columns: 120px minmax(0, 1fr) !important;
        align-items: flex-start !important;
        gap: 24px !important;
        width: 100% !important;
        margin-top: 18px !important;
        padding-top: 16px !important;
        border-top: 2px solid #e8ecec !important;
        box-sizing: border-box !important;
    `;

    const qrSection = clone.querySelector('.qr-section');
    if (qrSection) qrSection.style.cssText = `
        flex: 0 0 auto !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        padding-left: 10px !important;
        box-sizing: border-box !important;
    `;

    const totalsSection = clone.querySelector('.totals-section');
    if (totalsSection) totalsSection.style.cssText = `
      min-width: 0 !important;
        display: flex !important;
        justify-content: flex-end !important;
        box-sizing: border-box !important;
    `;

    const totalsTable = clone.querySelector('.totals-table');
    if (totalsTable) totalsTable.style.cssText = `
      width: min(100%, 300px) !important;
      max-width: 300px !important;
      min-width: 0 !important;
      margin-left: auto !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
    `;

    const locBar = clone.querySelector('.location-bar');
    if (locBar) locBar.style.cssText = `
        position: relative !important;
        margin-top: 18px !important;
        padding-top: 12px !important;
        border-top: 2px dotted #053737 !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 12px !important;
        width: 100% !important;
        box-sizing: border-box !important;
    `;

    wrap.appendChild(clone);
    document.body.appendChild(wrap);

    try {
      // 7. Wait for fonts/images
      await new Promise(r => setTimeout(r, 600));

      // 8. Log actual rendered size
      const renderedWidth = clone.offsetWidth;
      const renderedHeight = clone.offsetHeight;
      console.log('📏 Rendered:', renderedWidth, 'x', renderedHeight, 'px');

      // 9. html2pdf — NO width forcing
      const opt = {
        margin:       [4, 4, 4, 4],
        filename:     `${safeText(dom.invoiceNo.value, 'invoice')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          // NO width/windowWidth — let html2canvas auto-detect
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
        },
        pagebreak: { mode: ['css', 'legacy'] },
      };

      const blob = await html2pdf().set(opt).from(clone).outputPdf('blob');
      return blob;

    } finally {
      wrap.remove();
    }
  }


    //  8. SAVE PDF
    
  async function savePdf() {
    const btn = dom.savePdfBtn;
    const originalLabel = btn.textContent;
    btn.textContent = '⏳ Generating...';
    btn.disabled = true;

    try {
      if (!qrDataURL) await new Promise(r => setTimeout(r, 500));
      if (!locationQrDataURL)             await new Promise(r => setTimeout(r, 500));

      const pdfBlob = await generatePDFBlob();

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeText(dom.invoiceNo.value, 'invoice')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      btn.textContent = `✅ Saved (${(pdfBlob.size / 1024).toFixed(1)} KB)`;
      setTimeout(() => {
        btn.textContent = originalLabel;
        btn.disabled = false;
        advanceInvoiceNumber();
        clearAll();
      }, 2000);
    } catch (err) {
      console.error('Save PDF failed:', err);
      alert('Save PDF failed: ' + err.message);
      btn.textContent = originalLabel;
      btn.disabled = false;
    }
  }


  // 9. PRINT
  function printInvoice() {
    const btn = dom.printBtn;
    const originalLabel = btn.textContent;
    window.focus();
    window.print();
    btn.textContent = '✅ Print dialog opened';
    setTimeout(() => {
      btn.textContent = originalLabel;
      advanceInvoiceNumber();
      clearAll();
    }, 2000);
  }


  // 10. EVENT LISTENERS
  document.addEventListener('click', function (event) {
    const btn = event.target.closest('[data-remove-index]');
    if (!btn) return;
    const index = Number(btn.dataset.removeIndex);
    if (Number.isInteger(index)) {
      items.splice(index, 1);
      render();
    }
  });

  if (dom.addItemBtn) dom.addItemBtn.addEventListener('click', addItem);
  if (dom.clearBtn)   dom.clearBtn.addEventListener('click', clearAll);
  if (dom.savePdfBtn) dom.savePdfBtn.addEventListener('click', savePdf);
  if (dom.printBtn)   dom.printBtn.addEventListener('click', printInvoice);

  if (dom.productName) dom.productName.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
  if (dom.price)       dom.price.addEventListener('keydown',       e => { if (e.key === 'Enter') addItem(); });
  if (dom.quantity)    dom.quantity.addEventListener('keydown',    e => { if (e.key === 'Enter') addItem(); });

  if (dom.companyName) {
    dom.companyName.addEventListener('input',  render);
    dom.companyName.addEventListener('change', render);
  }
  if (dom.customerVat) {
    dom.customerVat.addEventListener('input',  render);
    dom.customerVat.addEventListener('change', render);
  }
  if (dom.invoiceType) dom.invoiceType.addEventListener('change', render);


  // 11. INIT
  const nowISO = getCurrentDateTimeISO();
  if (dom.invoiceDate) dom.invoiceDate.value = nowISO.split('T')[0] || '';
  if (dom.invoiceTime) dom.invoiceTime.value = nowISO.split('T')[1] || '';
  if (dom.invoiceNo)   dom.invoiceNo.value   = getNextInvoiceNumber();

  console.log('✅ App initialized');
  console.log('QRCode  :', typeof QRCode   !== 'undefined' ? '✅ Loaded' : '❌ Missing');
  console.log('html2pdf:', typeof html2pdf !== 'undefined' ? '✅ Loaded' : '❌ Missing');
  render();
});
