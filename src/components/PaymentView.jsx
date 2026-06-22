import { useState } from 'react';

export default function PaymentView({ orderDetails, onPaymentSuccess, onBack, title = "Selesaikan Pembayaran", description = "Scan QRIS di bawah ini menggunakan aplikasi e-wallet Anda", showFeatures = false }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [extraPersons, setExtraPersons] = useState(0);

  const handleSimulatePayment = () => {
    setIsSimulating(true);
    // Simulate API call for payment verification
    setTimeout(() => {
      onPaymentSuccess();
    }, 2000);
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
            <div style={{ textAlign: 'left', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', fontSize: '0.95rem' }}>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--ink)' }}>
                <li>Maks. 5 orang</li>
                <li>5 menit sesi</li>
                <li>1 lembar cetak (tambah cetak 5.000)</li>
                <li>QR digital (send email/QR Download foto, link aktif 7 hari)</li>
              </ul>
              
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>Lebih dari 5 Orang?<br/><small style={{ fontWeight: 'normal', color: 'var(--muted)' }}>(+Rp 5.000 / orang)</small></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <button 
                    onClick={() => setExtraPersons(Math.max(0, extraPersons - 1))}
                    style={{ background: '#f1f5f9', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >-</button>
                  <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{extraPersons}</span>
                  <button 
                    onClick={() => setExtraPersons(extraPersons + 1)}
                    style={{ background: '#f1f5f9', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >+</button>
                </div>
              </div>
            </div>
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
        </div>

        <div className="qris-container">
          <div className="qr-mock">
            [MOCK QRIS IMAGE]
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
