import { useState } from 'react';
import LandingPage from './components/LandingPage.jsx';
import PackageTierView from './components/PackageTierView.jsx';
import HeadcountView from './components/HeadcountView.jsx';
import PaymentView from './components/PaymentView.jsx';
import CameraView from './components/CameraView.jsx';
import StudioEditorView from './components/StudioEditorView.jsx';
import LiveWallView from './components/LiveWallView.jsx';
import ThankYouScreen from './components/ThankYouScreen.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import { FILTERS } from './utils/photoConfig.js';

const STEPS = {
  IDLE: 'IDLE',
  PACKAGE_TIER: 'PACKAGE_TIER',
  HEADCOUNT: 'HEADCOUNT',
  PAYMENT_1: 'PAYMENT_1', // Initial payment
  CAMERA: 'CAMERA',
  STUDIO_EDITOR: 'STUDIO_EDITOR',
  PAYMENT_2: 'PAYMENT_2', // Upsell payment
  LIVE_WALL_SHARE: 'LIVE_WALL_SHARE',
  THANK_YOU: 'THANK_YOU',
};

export default function App() {
  const [currentStep, setCurrentStep] = useState(STEPS.IDLE);

  const [orderDetails, setOrderDetails] = useState({
    tier: null,
    headCount: 1,
    basePrice: 0,
    totalPrice: 0,
    filter: FILTERS[0]
  });

  const [upsellDetails, setUpsellDetails] = useState({
    variants: [],
    upsellPrice: 0,
    upsellItems: []
  });

  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  const resetApp = () => {
    setCurrentStep(STEPS.IDLE);
    setOrderDetails({
      tier: null,
      headCount: 1,
      basePrice: 0,
      totalPrice: 0,
      filter: FILTERS[0]
    });
    setUpsellDetails({
      variants: [],
      upsellPrice: 0,
      upsellItems: []
    });
    setCapturedPhotos([]);
    setSelectedPhotos([]);
  };

  const renderStep = () => {
    switch (currentStep) {
      case STEPS.IDLE:
        return <LandingPage onStart={() => setCurrentStep(STEPS.PACKAGE_TIER)} />;

      case STEPS.PACKAGE_TIER:
        return (
          <PackageTierView
            onNext={(tier) => {
              setOrderDetails(prev => ({ ...prev, tier }));
              setCurrentStep(STEPS.HEADCOUNT);
            }}
            onBack={() => setCurrentStep(STEPS.IDLE)}
          />
        );

      case STEPS.HEADCOUNT:
        return (
          <HeadcountView
            orderDetails={orderDetails}
            onNext={({ headCount, basePrice, totalPrice }) => {
              setOrderDetails(prev => ({ ...prev, headCount, basePrice, totalPrice }));
              setCurrentStep(STEPS.PAYMENT_1);
            }}
            onBack={() => setCurrentStep(STEPS.PACKAGE_TIER)}
          />
        );

      case STEPS.PAYMENT_1:
        return (
          <PaymentView
            title="Selesaikan Pembayaran"
            orderDetails={orderDetails}
            onPaymentSuccess={() => setCurrentStep(STEPS.CAMERA)}
            onBack={() => setCurrentStep(STEPS.HEADCOUNT)}
          />
        );

      case STEPS.CAMERA:
        return (
          <section className="workspace camera-workspace">
             <div className="stage-column">
               <CameraView
                  filter={orderDetails.filter}
                  poseLimit={orderDetails.tier.poseLimit}
                  onFinishSession={(photos) => {
                    setCapturedPhotos(photos);
                    setCurrentStep(STEPS.STUDIO_EDITOR);
                  }}
               />
             </div>
             <aside className="control-panel">
               <FilterPanel
                 filters={FILTERS}
                 selectedId={orderDetails.filter.id}
                 onSelect={(id) => {
                   const newFilter = FILTERS.find(f => f.id === id);
                   setOrderDetails(prev => ({ ...prev, filter: newFilter }));
                 }}
               />
             </aside>
          </section>
        );
        
      case STEPS.STUDIO_EDITOR:
        return (
          <StudioEditorView
            photos={capturedPhotos}
            onNext={(result) => {
              const upsellItems = result.upsellPrice > 0 ? [{ name: `Tambah ${result.variants.length - 1} Varian Cetak`, price: result.upsellPrice }] : [];
              setUpsellDetails({
                variants: result.variants,
                upsellPrice: result.upsellPrice,
                upsellItems
              });
              
              if (result.upsellPrice > 0) {
                setCurrentStep(STEPS.PAYMENT_2);
              } else {
                setCurrentStep(STEPS.LIVE_WALL_SHARE);
              }
            }}
          />
        );

      case STEPS.PAYMENT_2:
        return (
          <PaymentView
            title="Pembayaran Tambahan (Upsell)"
            description="Anda menambahkan frame/template premium. Silakan selesaikan pembayaran."
            orderDetails={{
              totalPrice: upsellDetails.upsellPrice,
              upsellDetails: upsellDetails.upsellItems
            }}
            onPaymentSuccess={() => setCurrentStep(STEPS.LIVE_WALL_SHARE)}
            onBack={() => setCurrentStep(STEPS.UPSELL)}
          />
        );
        
      case STEPS.LIVE_WALL_SHARE:
        return (
          <LiveWallView
            orderDetails={orderDetails}
            upsellDetails={upsellDetails}
            selectedPhotos={selectedPhotos}
            onNext={() => setCurrentStep(STEPS.THANK_YOU)}
          />
        );

      case STEPS.THANK_YOU:
        return <ThankYouScreen onReset={resetApp} />;

      default:
        return <LandingPage onStart={() => setCurrentStep(STEPS.PACKAGE_TIER)} />;
    }
  };

  return (
    <main className="app-shell wizard-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={resetApp}>
          <span className="brand-mark">P</span>
          <span>Urbanmenphoto</span>
        </button>
        <span className="privacy-note">Client-only. No upload. No database.</span>
      </header>

      {renderStep()}
    </main>
  );
}
