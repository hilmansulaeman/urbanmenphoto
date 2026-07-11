import { useState } from 'react';
import { logTransaction } from '../utils/transactionLogger.js';
import { backendRequest, reportMonitoringError } from '../utils/backendApi.js';

export default function PaymentView({ orderDetails, onPaymentSuccess, onBack, title = "PEMBAYARAN", description = "Scan QRIS di bawah ini menggunakan aplikasi e-wallet Anda", showFeatures = false }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [customerEmail, setCustomerEmail] = useState(orderDetails.email || orderDetails.backendSession?.email || '');
  const paymentMode = String(import.meta.env.VITE_PAYMENT_MODE || import.meta.env.VITE_MIDTRANS_ENVIRONMENT || 'sandbox').toLowerCase();
  const isDummyPayment = paymentMode === 'dummy';
  const normalizedEmail = customerEmail.trim().toLowerCase();

  const loadMidtransSnap = () => new Promise((resolve, reject) => {
    if (window.snap) {
      resolve(window.snap);
      return;
    }
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    if (!clientKey) {
      reject(new Error('Midtrans client key belum dikonfigurasi.'));
      return;
    }
    const environment = String(import.meta.env.VITE_MIDTRANS_ENVIRONMENT || 'sandbox').toLowerCase();
    const script = document.createElement('script');
    script.src = environment === 'production'
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => window.snap ? resolve(window.snap) : reject(new Error('Midtrans Snap gagal dimuat.'));
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap.js.'));
    document.body.appendChild(script);
  });

  const handleMidtransPayment = async () => {
    setIsSimulating(true);
    setPaymentError('');

    let pkgName = orderDetails.tier?.name || 'Package';
    if (showFeatures) {
       pkgName = 'Basic Package';
    } else if (orderDetails.upsellDetails) {
       pkgName = `Upsell: ${orderDetails.upsellDetails.map(u => u.name).join(', ')}`;
    }

    try {
      if (normalizedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
        throw new Error('Format email tidak valid.');
      }

      const session = orderDetails.backendSession || await backendRequest('/api/sessions', null, {
        method: 'POST',
        body: JSON.stringify({
          status: 'created',
          email: normalizedEmail || null,
          paperSize: orderDetails.paperSize,
          layoutId: orderDetails.layoutId,
          frameId: orderDetails.frameId,
        }),
      });
      if (orderDetails.backendSession?.id && normalizedEmail && orderDetails.backendSession.email !== normalizedEmail) {
        await backendRequest(`/api/sessions/${orderDetails.backendSession.id}`, null, {
          method: 'PATCH',
          sessionToken: orderDetails.backendSession.customerToken,
          body: JSON.stringify({ email: normalizedEmail }),
        });
        session.email = normalizedEmail;
      }
      if (isDummyPayment) {
        const payment = await backendRequest('/api/payments', null, {
          method: 'POST',
          sessionToken: session.customerToken,
          body: JSON.stringify({
            sessionId: session.id,
            provider: 'qris-simulation',
            amount: currentTotal,
            currency: 'IDR',
          }),
        });
        logTransaction({
          amount: currentTotal,
          packageName: pkgName,
          method: 'Midtrans Dummy',
          status: 'Success'
        });
        onPaymentSuccess({
          session,
          payment,
          midtransResult: {
            transaction_status: 'settlement',
            payment_type: 'dummy',
          },
        });
        return;
      }

      let payment = await backendRequest('/api/payments', null, {
        method: 'POST',
        sessionToken: session.customerToken,
        body: JSON.stringify({
          sessionId: session.id,
          provider: 'midtrans',
          amount: currentTotal,
          currency: 'IDR',
        }),
      });

      if (!payment.snapToken) {
        throw new Error('Backend tidak mengembalikan Midtrans Snap token.');
      }

      const snap = await loadMidtransSnap();
      snap.pay(payment.snapToken, {
        onSuccess: async (result) => {
          logTransaction({
            amount: currentTotal,
            packageName: pkgName,
            method: 'Midtrans',
            status: result?.transaction_status || 'Success'
          });
          try {
            payment = await backendRequest(`/api/payments/${payment.id}`, null);
          } catch {
            // Webhook may still be processing; continue with the original payment data.
          }
          onPaymentSuccess({ session, payment, midtransResult: result });
        },
        onPending: (result) => {
          setIsSimulating(false);
          setPaymentError('Pembayaran masih pending. Selesaikan pembayaran dari aplikasi Anda.');
          console.info('Midtrans pending payment:', result);
        },
        onError: (result) => {
          reportMonitoringError({
            category: 'payment',
            sessionId: session.id,
            message: 'Midtrans payment error.',
            source: 'payment_view',
            metadata: { result, paymentId: payment.id },
          });
          setIsSimulating(false);
          setPaymentError('Pembayaran gagal. Silakan coba lagi.');
        },
        onClose: () => {
          setIsSimulating(false);
          setPaymentError('Popup pembayaran ditutup sebelum selesai.');
        }
      });
    } catch (err) {
      reportMonitoringError({
        category: 'payment',
        sessionId: orderDetails.backendSession?.id || '',
        message: err.message || 'Gagal memproses payment.',
        source: 'payment_view',
        metadata: {
          amount: currentTotal,
          paperSize: orderDetails.paperSize || '',
          layoutId: orderDetails.layoutId || '',
          frameId: orderDetails.frameId || '',
        },
      });
      setIsSimulating(false);
      setPaymentError(err.message);
    }
  };

  const currentTotal = orderDetails.totalPrice || 0;

  if (isSimulating) {
    return (
      <div className="wizard-step payment-success">
        <div className="success-icon">...</div>
        <h2>Membuka Pembayaran</h2>
        <p className="subtitle">Tunggu sebentar, Midtrans sedang disiapkan...</p>
      </div>
    );
  }

  return (
    <section className="wizard-step" aria-label="Payment">
      <header className="wizard-header">
        {onBack && <button className="back-button" onClick={onBack}>← Back</button>}
        <h2>{title}</h2>
        <p className="subtitle">{description}</p>
      </header>

      <div className="payment-content">
        <div className="order-summary">
          <h3>Ringkasan Pesanan</h3>
          
          {showFeatures && (
            <>
              <div style={{ textAlign: 'left', marginBottom: '1.5rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', color: 'var(--ink)' }}>
                  <div>Maks. 5 orang</div>
                  <div>5 menit sesi Foto</div>
                  <div>1 lembar cetak (tambah cetak 5.000)</div>
                  <div>QR digital (send email/QR Download foto, link aktif 7 hari)</div>
                </div>
              </div>
            </>
          )}
          
          {orderDetails.tier && !showFeatures && (
            <div className="summary-row">
              <span>Paket {orderDetails.tier.name}</span>
              <span>Rp {orderDetails.tier.pricePerHead?.toLocaleString('id-ID')} / org</span>
            </div>
          )}

          {orderDetails.headCount && !showFeatures && (
            <div className="summary-row">
              <span>Jumlah Orang</span>
              <span>{orderDetails.headCount}x</span>
            </div>
          )}

          {orderDetails.upsellDetails && orderDetails.upsellDetails.map((item, idx) => (
            <div className="summary-row" key={idx}>
              <span>{item.name}</span>
              <span>Rp {item.price.toLocaleString('id-ID')}</span>
            </div>
          ))}

          <div className="summary-row total">
            <span>Total Bayar</span>
            <span>Rp {currentTotal.toLocaleString('id-ID')}</span>
          </div>

          <label style={{ display: 'block', marginTop: '1.25rem', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', fontWeight: 800 }}>
            Email Customer
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="nama@email.com"
              style={{
                display: 'block',
                width: '100%',
                marginTop: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                padding: '0.95rem 1rem',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#111827',
                outline: 'none',
              }}
            />
          </label>

          <button className="primary-action simulate-btn" onClick={handleMidtransPayment} style={{ marginTop: '2rem' }}>
            {isDummyPayment ? 'Bayar Dummy' : 'Bayar dengan Midtrans'}
          </button>
          {paymentError && (
            <p style={{ margin: '1rem 0 0', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}>{paymentError}</p>
          )}
        </div>

        <div className="qris-container">
          <div className="qr-mock" style={{ padding: '0', background: 'transparent', border: 'none' }}>
            <div style={{ width: '250px', height: '250px', borderRadius: '16px', background: '#fff7ed', border: '1px solid #fed7aa', display: 'grid', placeItems: 'center', textAlign: 'center', color: '#ea580c', fontWeight: 900, padding: '1rem' }}>
              Midtrans Snap
            </div>
          </div>
          <p className="payment-instruction">
            Mendukung pembayaran dari:<br/>
            <strong>Gopay, OVO, Dana, ShopeePay, BCA, dll</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
