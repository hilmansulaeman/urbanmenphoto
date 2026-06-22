import { useState } from 'react';

export default function PaymentView({ orderDetails, onPaymentSuccess, onBack, title = "Selesaikan Pembayaran", description = "Scan QRIS di bawah ini menggunakan aplikasi e-wallet Anda" }) {
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulatePayment = () => {
    setIsSimulating(true);
    // Simulate API call for payment verification
    setTimeout(() => {
      onPaymentSuccess();
    }, 2000);
  };

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
          
          {orderDetails.tier && (
            <div className="summary-row">
              <span>Paket {orderDetails.tier.name}</span>
              <span>Rp {orderDetails.tier.pricePerHead.toLocaleString('id-ID')} / org</span>
            </div>
          )}

          {orderDetails.headCount && (
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
            <span>Rp {orderDetails.totalPrice.toLocaleString('id-ID')}</span>
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
