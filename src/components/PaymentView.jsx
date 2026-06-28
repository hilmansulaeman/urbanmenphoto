import { useState } from 'react';
import { logTransaction } from '../utils/transactionLogger.js';
import { backendRequest } from '../utils/backendApi.js';

export default function PaymentView({ orderDetails, onPaymentSuccess, onBack, title = "PEMBAYARAN", description = "Scan QRIS di bawah ini menggunakan aplikasi e-wallet Anda", showFeatures = false }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [extraPersons, setExtraPersons] = useState(0);

  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    setPaymentError('');

    let pkgName = orderDetails.tier?.name || 'Package';
    if (showFeatures) {
       pkgName = `Basic Package (+${extraPersons} extra person)`;
    } else if (orderDetails.upsellDetails) {
       pkgName = `Upsell: ${orderDetails.upsellDetails.map(u => u.name).join(', ')}`;
    }

    logTransaction({
      amount: currentTotal,
      packageName: pkgName,
      method: 'QRIS',
      status: 'Success'
    });

    try {
      const session = orderDetails.backendSession || await backendRequest('/api/sessions', null, {
        method: 'POST',
        body: JSON.stringify({
          status: 'created',
          paperSize: orderDetails.paperSize,
          layoutId: orderDetails.layoutId,
          frameId: orderDetails.frameId,
        }),
      });
      let payment = await backendRequest('/api/payments', null, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: session.id,
          provider: 'qris-simulation',
          amount: currentTotal,
          currency: 'IDR',
        }),
      });
      const webhookSecret = import.meta.env.VITE_PAYMENT_WEBHOOK_SECRET;
      if (webhookSecret) {
        try {
          payment = await backendRequest(`/api/payments/${payment.id}/webhook`, null, {
            method: 'POST',
            headers: { 'x-webhook-secret': webhookSecret },
            body: JSON.stringify({ status: 'paid' }),
          });
        } catch (webhookErr) {
          console.warn('Payment webhook simulation failed:', webhookErr);
        }
      }
      setTimeout(() => {
        onPaymentSuccess({ session, payment });
      }, 1200);
    } catch (err) {
      setIsSimulating(false);
      setPaymentError(err.message);
    }
  };

  const extraPersonPrice = 5000;
  const currentTotal = (orderDetails.totalPrice || 0) + (extraPersons * extraPersonPrice);

  if (isSimulating) {
    return (
      <div className="wizard-step payment-success">
        <div className="success-icon">✓</div>
        <h2>Pembayaran Berhasil!</h2>
        <p className="subtitle">Memproses pesanan Anda...</p>
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
                  <div>5 menit sesi</div>
                  <div>1 lembar cetak (tambah cetak 5.000)</div>
                  <div>QR digital (send email/QR Download foto, link aktif 7 hari)</div>
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>Lebih dari 5 Orang?<br/><small style={{ fontWeight: 'normal', color: 'var(--muted)', fontSize: '0.75rem' }}>(+Rp 5.000 / orang)</small></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <button 
                    onClick={() => setExtraPersons(Math.max(0, extraPersons - 1))}
                    style={{ background: '#f8fafc', border: 'none', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >-</button>
                  <span style={{ fontWeight: '800', width: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{extraPersons}</span>
                  <button 
                    onClick={() => setExtraPersons(extraPersons + 1)}
                    style={{ background: '#f8fafc', border: 'none', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >+</button>
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

          <button className="primary-action simulate-btn" onClick={handleSimulatePayment} style={{ marginTop: '2rem' }}>
            Simulasikan Bayar Berhasil
          </button>
          {paymentError && (
            <p style={{ margin: '1rem 0 0', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}>{paymentError}</p>
          )}
        </div>

        <div className="qris-container">
          <div className="qr-mock" style={{ padding: '0', background: 'transparent', border: 'none' }}>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MockPayment" alt="QRIS" style={{ width: '100%', height: 'auto', borderRadius: '12px' }} />
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
